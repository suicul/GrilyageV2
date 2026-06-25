import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { UserOrdersGateway } from '../orders/user-orders.gateway';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  category: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  product: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  order: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
};

const mockGateway = { notifyOrderUpdated: jest.fn() };
const mockUserGateway = { notifyCourierLocation: jest.fn() };
const mockConfig = { get: jest.fn() };

describe('AdminService', () => {
  let service: AdminService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersGateway, useValue: mockGateway },
        { provide: UserOrdersGateway, useValue: mockUserGateway },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('categories', () => {
    it('should create category', async () => {
      mockPrisma.category.create.mockResolvedValue({ id: 'cat-1', name: 'Drinks', slug: 'drinks' });
      const r = await service.createCategory({ name: 'Drinks' });
      expect(r.name).toBe('Drinks');
      expect(mockPrisma.category.create).toHaveBeenCalled();
    });

    it('should throw on missing category for update', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.updateCategory('bad-id', { name: 'X' })).rejects.toThrow('Категория не найдена');
    });
  });

  describe('order status transitions', () => {
    it('should reject invalid transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'NEW' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.updateOrderStatus('o1', { status: 'COMPLETED' as any }, 'staff-1')).rejects.toThrow('Невозможен переход');
    });

    it('should allow valid transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'NEW' });
      mockPrisma.order.update.mockResolvedValue({
        id: 'o1', status: 'CONFIRMED',
        items: [], statusLogs: [],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await service.updateOrderStatus('o1', { status: 'CONFIRMED' as any }, 'staff-1');
      expect(r.status).toBe('CONFIRMED');
    });
  });
});
