import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryMode, PaymentMethod } from '@prisma/client';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockService = {
    create: jest.fn(),
    findMyOrders: jest.fn(),
    findMyOrderById: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('POST /orders should create order', async () => {
    const dto = {
      items: [{ productId: 'p1', qty: 1 }],
      deliveryMode: DeliveryMode.DELIVERY,
      paymentMethod: PaymentMethod.CASH,
      customerName: 'Test',
      customerPhone: '+79999999999',
    };
    mockService.create.mockResolvedValue({ id: 'o1' });

    const result = await controller.create(dto, {} as any);
    expect(result).toEqual({ id: 'o1' });
  });

  it('GET /staff/orders should list orders', async () => {
    mockService.findAll.mockResolvedValue([{ id: 'o1' }]);

    const result = await controller.findAll();
    expect(result).toEqual([{ id: 'o1' }]);
  });

  it('PATCH /staff/orders/:id/status should update status', async () => {
    mockService.updateStatus.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
    const req = { user: { sub: 'staff-1' } } as any;

    const result = await controller.updateStatus('o1', { status: 'CONFIRMED' as any }, req) as any;
    expect(result.status).toBe('CONFIRMED');
  });
});
