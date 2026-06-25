import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { DeliveryMode, OrderStatus } from '@prisma/client';
import { getDeliveryCost, canTransition, toKopecks } from '@grilyage/shared';
import { OrdersGateway } from './orders.gateway';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    // 1. Fetch products from DB (server-side — NEVER trust client prices)
    const productIds = dto.items.map((i) => i.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await this.prisma.product.findMany({
      where: {
        active: true,
        id: { in: uniqueProductIds },
      },
    });

    const productsById = new Map(products.map((product) => [product.id, product]));

    // 2. Calculate items total server-side
    let itemsTotal = 0;
    const orderItems: Array<{
      productId: string;
      nameSnapshot: string;
      priceSnapshot: number;
      qty: number;
    }> = [];

    for (const item of dto.items) {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Товар ${item.productId} не найден`);
      }
      const productPrice = toKopecks(product.priceRubles, product.priceKopecks);
      itemsTotal += productPrice * item.qty;
      orderItems.push({
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: productPrice,
        qty: item.qty,
      });
    }

    // 3. Calculate delivery cost server-side
    const deliveryCost = getDeliveryCost(itemsTotal, dto.deliveryMode as any);
    const total = itemsTotal + deliveryCost;

    // 4. Create order with all items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: userId ?? null,
          status: OrderStatus.NEW,
          deliveryMode: dto.deliveryMode,
          paymentMethod: dto.paymentMethod,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail ?? null,
          address: dto.address ?? null,
          desiredTime: dto.desiredTime ?? null,
          comment: dto.comment ?? null,
          itemsTotal,
          deliveryCost,
          total,
          items: {
            create: orderItems,
          },
          statusLogs: {
            create: {
              status: OrderStatus.NEW,
            },
          },
        },
        include: {
          items: true,
          statusLogs: true,
        },
      });
      return created;
    });

    // 5. Notify staff via WebSocket (fire-and-forget — not in transaction)
    this.gateway.notifyOrderCreated(order);

    // 6. Send confirmation email if customer provided email (fire-and-forget)
    if (dto.customerEmail) {
      this.emailService.sendOrderConfirmation(dto.customerEmail, order.number).catch(() => {});
    }

    // 7. Send push notification to all staff about new order
    this.pushService
      .sendToAllStaff({
        title: 'Новый заказ',
        body: `Заказ №${order.number} на ${(order.total / 100).toFixed(2)} ₽`,
        data: {
          type: 'order.new',
          orderId: order.id,
        },
      })
      .catch(() => {});

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async findMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.userId !== userId) throw new ForbiddenException('Доступ запрещён');

    return order;
  }

  // --- Staff/Operator methods ---

  async findAll(query: { status?: string; date?: string }) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      const date = new Date(query.date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: date, lt: next };
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, staffUserId: string) {
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
          create: {
            status: dto.status,
            staffUserId,
          },
        },
      },
      include: {
        items: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    this.gateway.notifyOrderUpdated(updated);

    // Send push notification to the order owner
    if (updated.userId) {
      const statusLabel = this.statusLabel(dto.status);
      this.pushService
        .sendToUser(updated.userId, {
          title: 'Статус заказа изменён',
          body: `Заказ №${updated.number}: ${statusLabel}`,
          data: {
            type: 'order.status',
            orderId: updated.id,
            status: dto.status,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      NEW: 'Новый',
      CONFIRMED: 'Подтверждён',
      PREPARING: 'Готовится',
      READY: 'Готов',
      DELIVERING: 'В пути',
      DELIVERED: 'Доставлен',
      COMPLETED: 'Завершён',
      CANCELLED: 'Отменён',
    };
    return labels[status] ?? status;
  }
}
