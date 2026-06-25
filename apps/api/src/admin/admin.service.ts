import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { UserOrdersGateway } from '../orders/user-orders.gateway';
import { CreateCategoryDto, UpdateCategoryDto, UpdateOrderStatusDto, CreatePromotionDto, UpdatePromotionDto, CreateStaffUserDto, UpdateStaffUserDto, CreateSubcategoryDto, UpdateSubcategoryDto, CreateProductDto, UpdateProductDto, AssignCourierDto, UpdateCourierLocationDto } from './admin.dto';
import { StaffRole, TransportType } from '@prisma/client';
import { canTransition, toKopecks } from '@grilyage/shared';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/** Haversine distance in km between two lat/lng points */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
    private readonly userGateway: UserOrdersGateway,
    private readonly config: ConfigService,
  ) {}

  /* ─── Categories ─── */
  async listCategories() {
    return this.prisma.category.findMany({
      include: { subcategories: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, '-');
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl: dto.imageUrl,
        active: dto.active ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    return this.prisma.category.delete({ where: { id } });
  }

  /* ─── Subcategories ─── */
  async createSubcategory(categoryId: string, dto: CreateSubcategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    const slug = dto.slug ?? dto.name.toLowerCase().replace(/[^а-яёa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return this.prisma.subcategory.create({
      data: {
        categoryId,
        name: dto.name,
        slug,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateSubcategory(id: string, dto: UpdateSubcategoryDto) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Подкатегория не найдена');
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async deleteSubcategory(id: string) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Подкатегория не найдена');
    return this.prisma.subcategory.delete({ where: { id } });
  }

  /* ─── Products ─── */
  async listProducts(skip = 0, take = 50) {
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take,
        include: { subcategory: { include: { category: true } } },
        orderBy: [{ subcategory: { category: { sortOrder: 'asc' } } }, { sortOrder: 'asc' }],
      }),
      this.prisma.product.count(),
    ]);
    return {
      data: data.map((p) => ({
        ...p,
        price: toKopecks(p.priceRubles, p.priceKopecks),
      })),
      total,
      skip,
      take,
    };
  }

  async createProduct(dto: CreateProductDto) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id: dto.subcategoryId } });
    if (!sub) throw new BadRequestException('Подкатегория не найдена');
    const slug = dto.slug ?? dto.name.toLowerCase().replace(/[^а-яёa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return this.prisma.product.create({
      data: {
        subcategoryId: dto.subcategoryId,
        name: dto.name,
        slug,
        description: dto.description ?? '',
        priceRubles: dto.priceRubles,
        priceKopecks: dto.priceKopecks ?? 0,
        weightGrams: dto.weightGrams,
        kcal: dto.kcal,
        protein: dto.protein,
        fat: dto.fat,
        carbs: dto.carbs,
        imageUrl: dto.imageUrl ?? null,
        isNew: dto.isNew ?? false,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 10,
      },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const prod = await this.prisma.product.findUnique({ where: { id } });
    if (!prod) throw new NotFoundException('Товар не найден');
    const data: any = {};
    if (dto.subcategoryId !== undefined) data.subcategoryId = dto.subcategoryId;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceRubles !== undefined) data.priceRubles = dto.priceRubles;
    if (dto.priceKopecks !== undefined) data.priceKopecks = dto.priceKopecks;
    if (dto.weightGrams !== undefined) data.weightGrams = dto.weightGrams;
    if (dto.kcal !== undefined) data.kcal = dto.kcal;
    if (dto.protein !== undefined) data.protein = dto.protein;
    if (dto.fat !== undefined) data.fat = dto.fat;
    if (dto.carbs !== undefined) data.carbs = dto.carbs;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.isNew !== undefined) data.isNew = dto.isNew;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string) {
    const prod = await this.prisma.product.findUnique({ where: { id } });
    if (!prod) throw new NotFoundException('Товар не найден');
    return this.prisma.product.delete({ where: { id } });
  }

  /* ─── Promotions ─── */
  async listPromotions() {
    return this.prisma.promotion.findMany({ orderBy: { startsAt: 'desc' } });
  }

  async createPromotion(dto: CreatePromotionDto) {
    const data: any = { title: dto.title, description: dto.description ?? '', discountPercent: dto.discountPercent, active: dto.active ?? true };
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    return this.prisma.promotion.create({ data });
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Акция не найдена');
    const data: any = {};
    ['title', 'description', 'discountPercent', 'active'].forEach((k) => {
      if ((dto as any)[k] !== undefined) data[k] = (dto as any)[k];
    });
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    return this.prisma.promotion.update({ where: { id }, data });
  }

  async deletePromotion(id: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Акция не найдена');
    return this.prisma.promotion.delete({ where: { id } });
  }

  /* ─── Staff Users ─── */
  async listStaffUsers() {
    return this.prisma.staffUser.findMany({
      select: { id: true, login: true, name: true, role: true, active: true, transportType: true, deliveryRadius: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const allowed = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'COURIER'];
    if (!allowed.includes(dto.role)) throw new BadRequestException('Роль должна быть SUPER_ADMIN, ADMIN, OPERATOR или COURIER');
    const existing = await this.prisma.staffUser.findUnique({ where: { login: dto.login } });
    if (existing) throw new BadRequestException('Логин уже занят');
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const data: any = {
      login: dto.login,
      name: dto.name,
      passwordHash,
      role: dto.role as StaffRole,
      active: dto.active ?? true,
    };

    if (dto.role === 'COURIER') {
      data.transportType = dto.transportType ?? 'WALKING';
      data.deliveryRadius = dto.deliveryRadius ?? 5;
    }

    return this.prisma.staffUser.create({
      data,
      select: { id: true, login: true, name: true, role: true, active: true, transportType: true, deliveryRadius: true, createdAt: true },
    });
  }

  async updateStaffUser(id: string, dto: UpdateStaffUserDto) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Сотрудник не найден');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.transportType !== undefined) data.transportType = dto.transportType;
    if (dto.deliveryRadius !== undefined) data.deliveryRadius = dto.deliveryRadius;
    return this.prisma.staffUser.update({
      where: { id },
      data,
      select: { id: true, login: true, name: true, role: true, active: true, transportType: true, deliveryRadius: true, createdAt: true },
    });
  }

  /* ─── Image Upload ─── */
  async saveImageFromUrl(url: string) {
    const uploadsDir = this.config.get<string>('UPLOADS_DIR', './uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException('Не удалось загрузить изображение по URL');
    const buffer = Buffer.from(await res.arrayBuffer());

    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);
    const publicUrl = `/uploads/${filename}`;
    return { url: publicUrl, message: 'Изображение сохранено' };
  }

  async listCourierOrders(staffUserId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { courierId: staffUserId },
          { status: { in: ['READY_FOR_PICKUP', 'DELIVERING'] } },
        ],
      },
      include: { items: true, statusLogs: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async assignCourier(orderId: string, dto: AssignCourierDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Заказ не найден');

    const courier = await this.prisma.staffUser.findUnique({ where: { id: dto.courierId } });
    if (!courier || courier.role !== StaffRole.COURIER) throw new BadRequestException('Курьер не найден');
    if (!courier.active) throw new BadRequestException('Курьер отключён');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { courierId: dto.courierId, assignedAt: new Date() },
      include: { items: true, courier: { select: { id: true, name: true, transportType: true } } },
    });
  }

  async updateCourierLocation(staffUserId: string, dto: UpdateCourierLocationDto) {
    const courier = await this.prisma.staffUser.findUnique({ where: { id: staffUserId } });
    if (!courier || courier.role !== StaffRole.COURIER) throw new BadRequestException('Курьер не найден');

    await this.prisma.staffUser.update({
      where: { id: staffUserId },
      data: { lastLatitude: dto.latitude, lastLongitude: dto.longitude, lastLocationAt: new Date() },
    });

    // Notify staff and users tracking this courier
    const activeOrders = await this.prisma.order.findMany({
      where: { courierId: staffUserId, status: { in: ['READY_FOR_PICKUP', 'DELIVERING'] } },
    });
    for (const order of activeOrders) {
      this.gateway.notifyCourierLocation(order.id, { latitude: dto.latitude, longitude: dto.longitude });
      this.userGateway.notifyCourierLocation(order.id, { latitude: dto.latitude, longitude: dto.longitude });
    }

    return { success: true };
  }

  async findNearestCourier(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Заказ не найден');
    // Use café coordinates as default pickup point
    const pickupLat = 54.9893;
    const pickupLng = 73.3682;
    // TODO: geocode order.address to use as delivery destination
    return this.findNearestAvailableCourier(pickupLat, pickupLng);
  }

  async findNearestAvailableCourier(deliveryLat: number, deliveryLng: number, transportType?: string) {
    const where: any = { role: StaffRole.COURIER, active: true, lastLatitude: { not: null }, lastLongitude: { not: null } };
    if (transportType) where.transportType = transportType;

    const couriers = await this.prisma.staffUser.findMany({
      where,
      select: { id: true, name: true, transportType: true, deliveryRadius: true, lastLatitude: true, lastLongitude: true },
    });

    if (couriers.length === 0) return null;

    // Calculate Haversine distance, filter by radius, sort nearest
    type Scored = typeof couriers[0] & { distanceKm: number };
    const scored: Scored[] = couriers
      .map((c) => {
        const distanceKm = haversineDistance(deliveryLat, deliveryLng, c.lastLatitude!, c.lastLongitude!);
        return { ...c, distanceKm };
      })
      .filter((c) => c.transportType === 'CAR' || c.distanceKm <= c.deliveryRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return scored[0] ?? null;
  }

  /* ─── Orders ─── */
  async listOrders(query: { status?: string; date?: string; skip?: number; take?: number }) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      const date = new Date(query.date);
      if (!Number.isNaN(date.getTime())) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        where.createdAt = { gte: date, lt: next };
      }
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: { items: true, statusLogs: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  /* ─── Dashboard ─── */
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const yesterdayEnd = todayStart;
    const weekAgo = new Date(todayStart.getTime() - 6 * 86_400_000);

    const [todayOrders, yesterdayOrders, weekOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: todayStart, lt: todayEnd } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: weekAgo, lt: todayEnd } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    /* Today */
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const todayAvg = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;

    const ordersByStatus: Record<string, number> = {};
    for (const o of todayOrders) ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;

    /* Yesterday */
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);

    /* Weekly trend */
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayStart.getTime() - (6 - i) * 86_400_000);
      dailyMap.set(d.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
    }
    for (const o of weekOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) { entry.orders++; entry.revenue += o.total; }
    }
    const weeklyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));

    /* Popular products */
    const productCount: Record<string, number> = {};
    for (const o of todayOrders) {
      if (o.items) for (const item of o.items) {
        productCount[item.nameSnapshot] = (productCount[item.nameSnapshot] || 0) + item.qty;
      }
    }
    const popularProducts = Object.entries(productCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    /* Recent 10 orders */
    const recentOrders = todayOrders.slice(0, 10).map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      customerName: o.customerName,
      total: o.total,
      createdAt: o.createdAt,
    }));

    return {
      today: { orders: todayOrders.length, revenue: todayRevenue, averageOrderValue: todayAvg, ordersByStatus },
      yesterday: { orders: yesterdayOrders.length, revenue: yesterdayRevenue },
      popularProducts,
      weeklyTrend,
      recentOrders,
    };
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, staffUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');

    if (!canTransition(order.status as any, dto.status as any)) {
      throw new BadRequestException(
        `Невозможен переход из ${order.status} в ${dto.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        statusLogs: {
          create: { status: dto.status, staffUserId },
        },
      },
      include: { items: true, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });

    this.gateway.notifyOrderUpdated(updated);
    return updated;
  }
}
