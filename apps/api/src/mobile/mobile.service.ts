import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { SocialAuthService } from '../social-auth/social-auth.service';
import { toKopecks, getDeliveryCost, DeliveryMode as SharedDeliveryMode } from '@grilyage/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MobileGateway } from './mobile.gateway';
import { validateOtpBackoff } from '../common/otp-backoff';
import { OtpThrottleService } from '../common/otp-throttle.service';

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);
  private readonly refreshTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly gateway: MobileGateway,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly otpThrottle: OtpThrottleService,
    private readonly social: SocialAuthService,
  ) {
    const raw = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    this.refreshTtl = this.parseTtl(raw);
  }

  // — Menu (flat, mobile-optimized) —

  async getMenu() {
    const categories = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, imageUrl: true },
    });

    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true,
        priceRubles: true, priceKopecks: true, weightGrams: true,
        kcal: true, protein: true, fat: true, carbs: true,
        imageUrl: true, isNew: true,
        subcategory: {
          select: {
            name: true, slug: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { startsAt: 'desc' },
    });

    return {
      categories,
      products: products.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, description: p.description,
        price: toKopecks(p.priceRubles, p.priceKopecks),
        weightGrams: p.weightGrams, kcal: p.kcal, protein: p.protein,
        fat: p.fat, carbs: p.carbs, imageUrl: p.imageUrl, isNew: p.isNew,
        categoryId: p.subcategory.category.id,
        categoryName: p.subcategory.category.name,
        categorySlug: p.subcategory.category.slug,
        subcategoryName: p.subcategory.name,
        subcategorySlug: p.subcategory.slug,
      })),
      promotions: promotions.map((pr) => ({
        id: pr.id, title: pr.title, description: pr.description,
        imageUrl: pr.imageUrl, discountPercent: pr.discountPercent,
        startsAt: pr.startsAt, endsAt: pr.endsAt,
      })),
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, description: true, active: true,
        priceRubles: true, priceKopecks: true, weightGrams: true,
        kcal: true, protein: true, fat: true, carbs: true,
        imageUrl: true, isNew: true,
        subcategory: {
          select: {
            name: true, slug: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Товар не найден');
    }

    return {
      id: product.id, name: product.name, slug: product.slug,
      description: product.description,
      price: toKopecks(product.priceRubles, product.priceKopecks),
      weightGrams: product.weightGrams,
      kcal: product.kcal, protein: product.protein,
      fat: product.fat, carbs: product.carbs,
      imageUrl: product.imageUrl, isNew: product.isNew,
      categoryId: product.subcategory.category.id,
      categoryName: product.subcategory.category.name,
      categorySlug: product.subcategory.category.slug,
      subcategoryName: product.subcategory.name,
      subcategorySlug: product.subcategory.slug,
    };
  }

  // — Auth —

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(password, user.passwordHash!);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.generateTokenPair(user.id, user.email ?? '');
  }

  async register(email: string, password: string, name: string, phone?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Этот email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, phone: phone ?? null },
    });

    await this.prisma.userConsent.create({
      data: { userId: user.id },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async refresh(refreshToken: string) {
    return this.prisma.$transaction(async (tx) => {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash: hash } });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Токен обновления недействителен');
      }

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const user = await tx.user.findUnique({ where: { id: stored.userId! } });
      if (!user) throw new UnauthorizedException('Пользователь не найден');

      return this.generateTokenPair(user.id, user.email ?? '');
    });
  }

  async sendCode(phone: string) {
    this.otpThrottle.checkIdentifier(phone);
    const existing = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existing) {
      throw new BadRequestException('Код уже отправлен. Повторите через 10 минут');
    }

    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.upsert({
      where: { identifier_purpose: { identifier: phone, purpose: 'AUTH' } },
      update: { code, expiresAt, usedAt: null, attempts: 0 },
      create: { identifier: phone, code, type: 'PHONE', purpose: 'AUTH', expiresAt },
    });

    this.logger.log(`Phone code ${code} generated for ${phone}`);
    return { success: true };
  }

  async completeAuth(phone: string, code: string, name?: string) {
    this.otpThrottle.checkIdentifier(phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!otp) throw new BadRequestException('Неверный или истёкший код');
    if (otp.attempts >= 5) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
      this.otpThrottle.recordFailedAttempt(phone);
      throw new BadRequestException('Превышено число попыток. Запросите новый код');
    }
    validateOtpBackoff(otp);
    if (otp.code !== code) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      this.otpThrottle.recordFailedAttempt(phone);
      throw new BadRequestException('Неверный или истёкший код');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    this.otpThrottle.clearIdentifier(phone);

    let user = await this.prisma.user.findFirst({ where: { phone } });
    if (!user) {
      const displayName = name?.trim() || 'User-' + phone.slice(-4);
      user = await this.prisma.user.create({
        data: { phone, name: displayName, email: `user_${phone.replace(/\D/g, '')}@temp.grilyazh-omsk.ru`, phoneVerifiedAt: new Date() },
      });
      await this.prisma.userConsent.create({ data: { userId: user.id } });
    } else if (!user.phoneVerifiedAt) {
      await this.prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    }

    const tokens = await this.generateTokenPair(user.id, user.email ?? '');
    return { ...tokens, user: { id: user.id, name: user.name, phone: user.phone, email: user.email } };
  }

  async checkAuthResult(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, code, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    return { auth: !!otp, phone };
  }

  // — Email OTP —

  async sendEmailOtp(email: string) {
    this.otpThrottle.checkIdentifier(email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Этот email уже зарегистрирован');

    const pending = await this.prisma.otpCode.findFirst({
      where: { identifier: email, type: 'EMAIL', purpose: 'VERIFY_EMAIL', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      throw new BadRequestException('Код уже отправлен. Повторите через 10 минут');
    }

    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { identifier: email, code, type: 'EMAIL', purpose: 'VERIFY_EMAIL', expiresAt },
    });

    await this.email.sendEmailOtp(email, code);
    this.logger.log(`Email OTP sent to ${email}`);
    return { success: true };
  }

  async verifyEmailOtp(email: string, code: string) {
    this.otpThrottle.checkIdentifier(email);
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: email, type: 'EMAIL', purpose: 'VERIFY_EMAIL', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!otp) throw new BadRequestException('Неверный или истёкший код');
    if (otp.attempts >= 5) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
      this.otpThrottle.recordFailedAttempt(email);
      throw new BadRequestException('Превышено число попыток. Запросите новый код');
    }
    validateOtpBackoff(otp);
    if (otp.code !== code) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      this.otpThrottle.recordFailedAttempt(email);
      throw new BadRequestException('Неверный или истёкший код');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    this.otpThrottle.clearIdentifier(email);
    this.logger.log(`Email OTP verified for ${email}`);
    return { success: true, verified: true };
  }

  // — Phone OTP (fallback) —

  async sendPhoneOtp(phone: string, email?: string) {
    this.otpThrottle.checkIdentifier(phone);
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const existing = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existing) {
      throw new BadRequestException('Код уже отправлен. Повторите через 10 минут');
    }

    await this.prisma.otpCode.create({
      data: { identifier: phone, code, type: 'PHONE', purpose: 'AUTH', expiresAt },
    });

    await this.sms.sendOtp(phone, code);
    this.logger.log(`Phone OTP ${code} sent via SMS to ${phone}`);

    if (email) {
      await this.email.sendPhoneOtp(email, code);
      this.logger.log(`Phone OTP ${code} sent via email to ${email} (fallback)`);
    }

    return { success: true };
  }

  async verifyPhoneOtp(phone: string, code: string) {
    this.otpThrottle.checkIdentifier(phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!otp) throw new BadRequestException('Неверный или истёкший код');
    if (otp.attempts >= 5) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
      this.otpThrottle.recordFailedAttempt(phone);
      throw new BadRequestException('Превышено число попыток. Запросите новый код');
    }
    validateOtpBackoff(otp);
    if (otp.code !== code) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      this.otpThrottle.recordFailedAttempt(phone);
      throw new BadRequestException('Неверный или истёкший код');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    this.otpThrottle.clearIdentifier(phone);
    return { success: true, verified: true };
  }

  // — Profile —

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, name: true, emailVerifiedAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, phone: true, name: true, emailVerifiedAt: true, createdAt: true },
    });
  }

  // — Addresses —

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId } });
  }

  async createAddress(userId: string, data: { label?: string; street: string; house: string; apartment?: string; comment?: string }) {
    return this.prisma.address.create({
      data: { ...data, userId },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const addr = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('Адрес не найден');
    return this.prisma.address.delete({ where: { id: addressId } });
  }

  // — Orders —

  async createOrder(userId: string, dto: {
    items: { productId: string; qty: number }[];
    deliveryMode: string;
    paymentMethod: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    address?: string;
    desiredTime?: string;
    comment?: string;
  }) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { active: true, id: { in: productIds } },
    });

    const productsById = new Map(products.map((p) => [p.id, p]));

    let itemsTotal = 0;
    const orderItems: Array<{
      productId: string;
      nameSnapshot: string;
      priceSnapshot: number;
      qty: number;
    }> = [];

    for (const item of dto.items) {
      const product = productsById.get(item.productId);
      if (!product) throw new BadRequestException(`Товар ${item.productId} не найден`);
      const price = toKopecks(product.priceRubles, product.priceKopecks);
      itemsTotal += price * item.qty;
      orderItems.push({
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: price,
        qty: item.qty,
      });
    }

    const deliveryCost = getDeliveryCost(itemsTotal, dto.deliveryMode as SharedDeliveryMode);
    const total = itemsTotal + deliveryCost;

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'NEW' as any,
        deliveryMode: dto.deliveryMode as any,
        paymentMethod: dto.paymentMethod as any,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail ?? null,
        address: dto.address ?? null,
        desiredTime: dto.desiredTime ?? null,
        comment: dto.comment ?? null,
        itemsTotal,
        deliveryCost,
        total,
        items: { create: orderItems },
        statusLogs: { create: { status: 'NEW' as any } },
      },
      include: { items: true, statusLogs: true },
    });

    this.gateway.notifyOrderCreated(order);
    return order;
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, number: true, status: true, total: true,
        itemsTotal: true, deliveryCost: true, deliveryMode: true,
        paymentMethod: true, customerName: true, address: true,
        desiredTime: true, comment: true, createdAt: true,
        items: {
          select: { id: true, nameSnapshot: true, priceSnapshot: true, qty: true },
        },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, createdAt: true } },
      },
    });
  }

  async getMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, number: true, status: true, total: true,
        itemsTotal: true, deliveryCost: true, deliveryMode: true,
        paymentMethod: true, customerName: true, customerPhone: true,
        customerEmail: true, address: true, desiredTime: true,
        comment: true, createdAt: true, userId: true,
        items: {
          select: { id: true, nameSnapshot: true, priceSnapshot: true, qty: true },
        },
        statusLogs: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.userId !== userId) throw new UnauthorizedException('Доступ запрещён');
    return order;
  }

  async getMyOrderCourierInfo(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, courierId: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.userId !== userId) throw new UnauthorizedException('Доступ запрещён');
    if (!order.courierId) {
      return { assigned: false, courier: null };
    }

    const courier = await this.prisma.staffUser.findUnique({
      where: { id: order.courierId },
      select: {
        id: true, name: true, transportType: true,
        lastLatitude: true, lastLongitude: true, lastLocationAt: true,
      },
    });

    if (!courier) {
      return { assigned: false, courier: null };
    }

    return {
      assigned: true,
      courier: {
        id: courier.id,
        name: courier.name,
        transportType: courier.transportType,
        latitude: courier.lastLatitude,
        longitude: courier.lastLongitude,
        lastLocationAt: courier.lastLocationAt,
      },
    };
  }

  // — Push Tokens —

  async registerPushToken(userId: string, token: string, platform: string) {
    // Deactivate old tokens for same device
    await this.prisma.pushToken.updateMany({
      where: { userId, token, active: true },
      data: { active: false },
    });

    return this.prisma.pushToken.create({
      data: { userId, token, platform },
    });
  }

  async unregisterPushToken(userId: string, token: string) {
    return this.prisma.pushToken.updateMany({
      where: { userId, token, active: true },
      data: { active: false },
    });
  }

  // — Internal —

  // — Social Auth —

  socialVk(accessToken: string) {
    return this.social.vkLogin(accessToken);
  }

  socialYandex(accessToken: string) {
    return this.social.yandexLogin(accessToken);
  }

  socialTelegram(dto: any) {
    return this.social.telegramLogin(dto);
  }

  socialEmailOtp(email: string, code: string) {
    return this.social.emailOtpLogin(email, code);
  }

  private generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async generateTokenPair(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTtl);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private parseTtl(raw: string): number {
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60;
    const val = parseInt(match[1]!, 10);
    switch (match[2]) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 30 * 24 * 60 * 60;
    }
  }
}
