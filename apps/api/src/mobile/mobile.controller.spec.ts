import { Test, TestingModule } from '@nestjs/testing';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

describe('MobileController', () => {
  let controller: MobileController;

  const mockService = {
    getMyOrderCourierInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [{ provide: MobileService, useValue: mockService }],
    }).compile();

    controller = module.get<MobileController>(MobileController);
    jest.clearAllMocks();
  });

  describe('GET orders/:id/courier', () => {
    it('should return assigned courier info', async () => {
      const courierData = {
        assigned: true,
        courier: {
          id: 'co-1',
          name: 'Иван',
          transportType: 'CAR',
          latitude: 54.98,
          longitude: 73.38,
          lastLocationAt: new Date(),
        },
      };
      mockService.getMyOrderCourierInfo.mockResolvedValue(courierData);

      const req = { user: { sub: 'user-1' } };
      const result = await controller.getOrderCourier(req as any, 'ord-1');

      expect(result).toEqual(courierData);
      expect(mockService.getMyOrderCourierInfo).toHaveBeenCalledWith('user-1', 'ord-1');
    });

    it('should return unassigned when no courier', async () => {
      mockService.getMyOrderCourierInfo.mockResolvedValue({
        assigned: false,
        courier: null,
      });

      const req = { user: { sub: 'user-1' } };
      const result = await controller.getOrderCourier(req as any, 'ord-2');

      expect(result.assigned).toBe(false);
      expect(result.courier).toBeNull();
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.getMyOrderCourierInfo.mockRejectedValue(
        new Error('Заказ не найден'),
      );

      const req = { user: { sub: 'user-1' } };

      await expect(
        controller.getOrderCourier(req as any, 'nonexistent'),
      ).rejects.toThrow('Заказ не найден');
    });

    it('should pass correct userId and orderId to service', async () => {
      mockService.getMyOrderCourierInfo.mockResolvedValue({
        assigned: false,
        courier: null,
      });

      const req = { user: { sub: 'specific-user' } };
      await controller.getOrderCourier(req as any, 'specific-order');

      expect(mockService.getMyOrderCourierInfo).toHaveBeenCalledWith(
        'specific-user',
        'specific-order',
      );
    });
  });
});
