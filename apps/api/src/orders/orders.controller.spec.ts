import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockService = {
    create: jest.fn(),
    findMyOrders: jest.fn(),
    findMyOrderById: jest.fn(),
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
      deliveryMode: 'DELIVERY' as any,
      paymentMethod: 'CASH' as any,
      customerName: 'Test',
      customerPhone: '+79999999999',
    };
    mockService.create.mockResolvedValue({ id: 'o1' });

    const result = await controller.create(dto, {} as any);
    expect(result).toEqual({ id: 'o1' });
  });

  it('GET /orders/my should return my orders', async () => {
    mockService.findMyOrders.mockResolvedValue([{ id: 'o1' }]);

    const result = await controller.findMyOrders({ user: { sub: 'u1' } } as any);
    expect(result).toEqual([{ id: 'o1' }]);
  });
});
