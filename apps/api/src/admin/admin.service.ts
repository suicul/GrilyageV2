import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateCategoryDto, UpdateCategoryDto, UpdateOrderStatusDto, CreatePromotionDto, UpdatePromotionDto, CreateStaffUserDto, UpdateStaffUserDto, CreateSubcategoryDto, UpdateSubcategoryDto } from './admin.dto';
import { OrderStatus, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.COOKING, OrderStatus.CANCELLED],
  [OrderStatus.COOKING]: [OrderStatus.DELIVERING, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
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
  async listProducts() {
    return this.prisma.product.findMany({
      include: { subcategory: { include: { category: true } } },
      orderBy: [{ subcategory: { category: { sortOrder: 'asc' } } }, { sortOrder: 'asc' }],
    });
  }

  async createProduct(dto: any) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id: dto.subcategoryId } });
    if (!sub) throw new BadRequestException('Подкатегория не найдена');
    const slug = dto.slug ?? dto.name.toLowerCase().replace(/[^а-яёa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return this.prisma.product.create({ data: { ...dto, slug } });
  }

  async updateProduct(id: string, dto: any) {
    const prod = await this.prisma.product.findUnique({ where: { id } });
    if (!prod) throw new NotFoundException('Товар не найден');
    return this.prisma.product.update({ where: { id }, data: dto });
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
    const data: any = { ...dto };
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
      select: { id: true, login: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    if (!['ADMIN', 'OPERATOR'].includes(dto.role)) throw new BadRequestException('Роль должна быть ADMIN или OPERATOR');
    const existing = await this.prisma.staffUser.findUnique({ where: { login: dto.login } });
    if (existing) throw new BadRequestException('Логин уже занят');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.staffUser.create({
      data: { login: dto.login, name: dto.name, passwordHash, role: dto.role as StaffRole, active: dto.active ?? true },
      select: { id: true, login: true, name: true, role: true, active: true, createdAt: true },
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
    return this.prisma.staffUser.update({
      where: { id },
      data,
      select: { id: true, login: true, name: true, role: true, active: true, createdAt: true },
    });
  }

  /* ─── Image Upload ─── */
  async saveImageFromUrl(url: string) {
    // For now, URL images are used directly (proxied through /uploads if local)
    // In production: download → sharp resize → save to uploads dir
    return { url, message: 'Изображение сохранено' };
  }

  /* ─── Orders ─── */
  async listOrders() {
    return this.prisma.order.findMany({
      include: { items: true, statusLogs: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');

    const allowed = VALID_TRANSITIONS[order.status as OrderStatus];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Невозможен переход из ${order.status} в ${dto.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        statusLogs: {
          create: { status: dto.status },
        },
      },
      include: { items: true, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });

    this.gateway.notifyOrderUpdated(updated);
    return updated;
  }
}
