import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryMode, PaymentMethod, OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockProducts = [
    { id: 'p1', name: 'Паста', slug: 'pasta', priceRubles: 410, priceKopecks: 0, active: true, subcategoryId: 's1' },
    { id: 'p2', name: 'Пирог', slug: 'pirog', priceRubles: 420, priceKopecks: 0, active: true, subcategoryId: 's2' },
  ];

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockGateway = {
    notifyOrderCreated: jest.fn(),
    notifyOrderUpdated: jest.fn(),
  };

  function setupProductMock() {
    (mockPrisma.product.findMany as jest.Mock).mockImplementation((args) => {
      const ids = args?.where?.id?.in;
      if (ids) {
        return mockProducts.filter(p => ids.includes(p.id));
      }
      return mockProducts;
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    setupProductMock();
  });

  describe('create', () => {
    it('should create order with correct server-side price calculation', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.order.create.mockImplementation(async ({ data }) => ({
        id: 'order-1',
        ...data,
        items: data.items.create,
        statusLogs: data.statusLogs.create,
      }));

      const result = await service.create({
        items: [
          { productId: 'p1', qty: 2 },
          { productId: 'p2', qty: 1 },
        ],
        deliveryMode: DeliveryMode.DELIVERY,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Test',
        customerPhone: '+79999999999',
      });

      expect(result.itemsTotal).toBe(124000); // 2*41000 + 1*42000
      expect(result.deliveryCost).toBe(19900); // below 150000 threshold
      expect(result.total).toBe(143900); // 124000 + 19900
    });

    it('should make delivery free above 1500 threshold', async () => {
      const expensive = [{ id: 'p3', name: 'Торт', slug: 'tort', priceRubles: 1500, priceKopecks: 0, active: true, subcategoryId: 's1' }];
      mockPrisma.product.findMany.mockResolvedValue(expensive);
      mockPrisma.order.create.mockImplementation(async ({ data }) => ({
        id: 'order-2', ...data, items: data.items.create, statusLogs: data.statusLogs.create,
      }));

      const result = await service.create({
        items: [{ productId: 'p3', qty: 1 }],
        deliveryMode: DeliveryMode.DELIVERY,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Test',
        customerPhone: '+79999999999',
      });

      expect(result.deliveryCost).toBe(0);
      expect(result.total).toBe(150000);
    });

    it('should make pickup free regardless of total', async () => {
      mockPrisma.product.findMany.mockImplementation((args) => {
        const ids = args?.where?.id?.in;
        if (ids) return mockProducts.filter(p => ids.includes(p.id));
        return mockProducts;
      });
      mockPrisma.order.create.mockImplementation(async ({ data }) => ({
        id: 'order-3', ...data, items: data.items.create, statusLogs: data.statusLogs.create,
      }));

      const result = await service.create({
        items: [{ productId: 'p1', qty: 1 }],
        deliveryMode: DeliveryMode.PICKUP,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Test',
        customerPhone: '+79999999999',
      });

      expect(result.deliveryCost).toBe(0);
    });

    it('should throw on invalid product', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]);

      await expect(
        service.create({
          items: [{ productId: 'p1', qty: 1 }, { productId: 'invalid', qty: 1 }],
          deliveryMode: DeliveryMode.DELIVERY,
          paymentMethod: PaymentMethod.CASH,
          customerName: 'Test',
          customerPhone: '+79999999999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should allow valid status transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.NEW,
      });
      mockPrisma.order.update.mockImplementation(async ({ data }) => ({
        id: 'order-1',
        status: data.status,
        items: [],
        statusLogs: [],
      }));

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMED },
        'staff-1',
      ) as any;
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should reject invalid status transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.NEW,
      });

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.COMPLETED },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
