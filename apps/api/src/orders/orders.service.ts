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
import { getDeliveryCost, canTransition } from '@grilyage/shared';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    // 1. Fetch products from DB (server-side — NEVER trust client prices)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Calculate items total server-side
    let itemsTotal = 0;
    const orderItems: Array<{
      productId: string;
      nameSnapshot: string;
      priceSnapshot: number;
      qty: number;
    }> = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
      itemsTotal += product.price * item.qty;
      orderItems.push({
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        qty: item.qty,
      });
    }

    // 3. Calculate delivery cost server-side
    const deliveryCost = getDeliveryCost(itemsTotal, dto.deliveryMode as any);
    const total = itemsTotal + deliveryCost;

    // 4. Create order with all items
    const order = await this.prisma.order.create({
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

    // 5. Notify staff via WebSocket
    this.gateway.notifyOrderCreated(order);

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

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

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

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, staffUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (!canTransition(order.status as any, dto.status as any)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
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
    return updated;
  }
}
