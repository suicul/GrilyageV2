import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { validateOtpBackoff } from '../common/otp-backoff';
import { OtpThrottleService, OtpThrottleException } from '../common/otp-throttle.service';
import * as crypto from 'crypto';

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);
  private readonly refreshTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly sms: SmsService,
    private readonly otpThrottle: OtpThrottleService,
  ) {
    const raw = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    this.refreshTtl = this.parseTtl(raw);
  }

  async vkLogin(accessToken: string) {
    this.logger.log(`VK login with token ${accessToken.slice(0, 10)}...`);
    const profile = await this.fetchVkProfile(accessToken);
    return this.socialAuthOrRegister('VK', String(profile.id), profile.email, `${profile.first_name} ${profile.last_name}`, profile.photo_200);
  }

  async yandexLogin(accessToken: string) {
    const profile: any = await this.fetchYandexProfile(accessToken);
    const name = profile.real_name || profile.display_name || profile.login || 'Пользователь';
    return this.socialAuthOrRegister('YANDEX', String(profile.id), profile.default_email, name, profile.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200` : null);
  }

  async yandexCodeLogin(code: string, redirectUri: string) {
    const tokenData = await this.exchangeYandexCode(code, redirectUri);
    const profile: any = await this.fetchYandexProfile(tokenData.access_token);
    const name = profile.real_name || profile.display_name || profile.login || 'Пользователь';
    return this.socialAuthOrRegister('YANDEX', String(profile.id), profile.default_email, name, profile.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200` : null);
  }

  async telegramLogin(authData: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }) {
    if (!this.verifyTelegramHash(authData)) {
      throw new UnauthorizedException('Недействительные данные Telegram');
    }
    const now = Math.floor(Date.now() / 1000);
    if (now - authData.auth_date > 86400) {
      throw new UnauthorizedException('Время авторизации истекло');
    }
    const name = [authData.first_name, authData.last_name].filter(Boolean).join(' ');
    return this.socialAuthOrRegister('TELEGRAM', String(authData.id), null, name || 'Пользователь', authData.photo_url ?? null);
  }

  async emailOtpLogin(email: string, code: string) {
    if (!email || !code) throw new BadRequestException('Email и код обязательны');
    this.otpThrottle.checkIdentifier(email);

    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: email, type: 'EMAIL', usedAt: null, expiresAt: { gt: new Date() } },
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

    let user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      const name = email!.split('@')[0] || 'Пользователь';
      user = await this.prisma.user.create({
        data: { email, name, passwordHash: null },
      });
      await this.prisma.userConsent.create({ data: { userId: user.id } });
    }

    await this.prisma.socialAccount.upsert({
      where: { provider_providerId: { provider: 'EMAIL', providerId: email } },
      update: { userId: user.id },
      create: { provider: 'EMAIL', providerId: email, email, userId: user.id, name: user.name },
    });

    return this.generateTokenPair(user.id, user.email ?? '');
  }

  async sendPhoneOtp(phone: string) {
    this.otpThrottle.checkIdentifier(phone);
    const existing = await this.prisma.otpCode.findFirst({
      where: { identifier: phone, type: 'PHONE', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existing) {
      throw new BadRequestException('Код уже отправлен. Повторите через 10 минут');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.upsert({
      where: { identifier_purpose: { identifier: phone, purpose: 'AUTH' } },
      update: { code, expiresAt, usedAt: null, attempts: 0 },
      create: { identifier: phone, code, type: 'PHONE', purpose: 'AUTH', expiresAt },
    });

    await this.sms.sendOtp(phone, code);
    this.logger.log(`Phone OTP ${code} sent to ${phone}`);
    return { success: true };
  }

  async phoneOtpLogin(phone: string, code: string, name?: string) {
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
        data: {
          phone,
          name: displayName,
          email: `user_${phone.replace(/\D/g, '')}@temp.grilyazh-omsk.ru`,
          phoneVerifiedAt: new Date(),
        },
      });
      await this.prisma.userConsent.create({ data: { userId: user.id } });
    } else if (!user.phoneVerifiedAt) {
      await this.prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    }

    await this.prisma.socialAccount.upsert({
      where: { provider_providerId: { provider: 'PHONE', providerId: phone } },
      update: { userId: user.id },
      create: { provider: 'PHONE', providerId: phone, userId: user.id, name: user.name },
    });

    return this.generateTokenPair(user.id, user.email ?? '');
  }

  async sendEmailOtp(email: string) {
    this.otpThrottle.checkIdentifier(email);
    const existing = await this.prisma.otpCode.findFirst({
      where: { identifier: email, type: 'EMAIL', purpose: 'AUTH', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existing) {
      throw new BadRequestException('Код уже отправлен. Повторите через 10 минут');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.upsert({
      where: { identifier_purpose: { identifier: email, purpose: 'AUTH' } },
      update: { code, expiresAt, usedAt: null, attempts: 0 },
      create: { identifier: email, code, type: 'EMAIL', purpose: 'AUTH', expiresAt },
    });

    await this.emailService.sendEmailOtp(email, code);

    return { success: true };
  }

  async getLinkedAccounts(userId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      select: { provider: true, providerId: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });
    return accounts;
  }

  async unlinkAccount(userId: string, provider: string, providerId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });
    if (!account || account.userId !== userId) {
      throw new BadRequestException('Привязка не найдена');
    }
    const count = await this.prisma.socialAccount.count({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (count <= 1 && !user?.passwordHash) {
      throw new BadRequestException('Нельзя отвязать единственный способ входа');
    }
    await this.prisma.socialAccount.delete({ where: { id: account.id } });
    return { success: true };
  }

  private async socialAuthOrRegister(
    provider: string, providerId: string,
    email: string | null, name: string, avatarUrl: string | null,
  ) {
    const existing = await this.prisma.socialAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    if (existing) {
      if (email && !existing.user.email) {
        await this.prisma.user.update({
          where: { id: existing.userId },
          data: { email },
        });
      }
      return this.generateTokenPair(existing.user.id, existing.user.email || email || `user@${provider}.id`);
    }

    let user = email ? await this.prisma.user.findFirst({ where: { email } }) : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash: null,
          emailVerifiedAt: email ? new Date() : null,
        },
      });
      await this.prisma.userConsent.create({ data: { userId: user.id } });
    }

    await this.prisma.socialAccount.create({
      data: { provider, providerId, userId: user.id, email, name: name ?? null, avatarUrl },
    });

    return this.generateTokenPair(user.id, user.email || `user@${provider}.id`);
  }

  private async fetchVkProfile(accessToken: string) {
    const url = `https://api.vk.com/method/users.get?v=5.131&access_token=${accessToken}&fields=photo_200,email`;
    const res = await fetch(url);
    const data = await res.json() as any;
    if (data.error) {
      this.logger.error('VK API error', data.error);
      throw new UnauthorizedException('Ошибка авторизации VK: ' + (data.error.error_msg || 'Неизвестная ошибка'));
    }
    const user = data.response?.[0];
    if (!user) throw new UnauthorizedException('Не удалось получить профиль VK');
    user.email = user.email || null;
    return user;
  }

  private async exchangeYandexCode(code: string, redirectUri: string) {
    const clientId = this.config.get<string>('NEXT_PUBLIC_YANDEX_CLIENT_ID');
    const clientSecret = this.config.get<string>('YANDEX_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Яндекс OAuth не настроен');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      this.logger.error(`Yandex token exchange failed: ${res.status} ${err}`);
      throw new UnauthorizedException('Ошибка обмена кода Яндекс');
    }
    return res.json() as Promise<{ access_token: string; expires_in: number; refresh_token?: string; token_type: string }>;
  }

  private async fetchYandexProfile(accessToken: string) {
    const res = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('Ошибка авторизации Яндекса');
    }
    return res.json();
  }

  private verifyTelegramHash(authData: {
    id: number; first_name: string; last_name?: string;
    username?: string; photo_url?: string; auth_date: number; hash: string;
  }): boolean {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, rejecting Telegram login');
      return false;
    }
    const fields: string[] = [];
    const check = { ...authData } as any;
    delete check.hash;
    const sorted = Object.keys(check).sort();
    for (const key of sorted) {
      if (check[key]) fields.push(`${key}=${check[key]}`);
    }
    const dataCheckString = fields.join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === authData.hash;
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
