import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { MobileGateway } from './mobile.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SocialAuthService } from '../social-auth/social-auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('MobileService — getMyOrderCourierInfo', () => {
  let service: MobileService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    staffUser: {
      findUnique: jest.fn(),
    },
  };

  const mockOtherDeps = {
    jwtService: {},
    config: { get: jest.fn().mockReturnValue('30d') },
    gateway: { notifyOrderCreated: jest.fn() },
    email: { sendEmailOtp: jest.fn(), sendPhoneOtp: jest.fn() },
    social: {},
  };

  const mockJwt = mockOtherDeps.jwtService;
  const mockConfig = mockOtherDeps.config;
  const mockGateway = mockOtherDeps.gateway;
  const mockEmail = mockOtherDeps.email;
  const mockSocial = mockOtherDeps.social;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MobileGateway, useValue: mockGateway },
        { provide: EmailService, useValue: mockEmail },
        { provide: SocialAuthService, useValue: mockSocial },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
    jest.clearAllMocks();
  });

  describe('getMyOrderCourierInfo', () => {
    it('should return assigned courier with location data', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        userId: 'user-1',
        courierId: 'co-1',
      });
      mockPrisma.staffUser.findUnique.mockResolvedValue({
        id: 'co-1',
        name: 'Иван',
        transportType: 'CAR',
        lastLatitude: 54.98,
        lastLongitude: 73.38,
        lastLocationAt: new Date('2026-06-24T10:00:00Z'),
      });

      const result = await service.getMyOrderCourierInfo('user-1', 'ord-1');

      expect(result.assigned).toBe(true);
      expect(result.courier).toEqual({
        id: 'co-1',
        name: 'Иван',
        transportType: 'CAR',
        latitude: 54.98,
        longitude: 73.38,
        lastLocationAt: expect.any(Date),
      });
    });

    it('should return unassigned when order has no courierId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        userId: 'user-1',
        courierId: null,
      });

      const result = await service.getMyOrderCourierInfo('user-1', 'ord-2');

      expect(result.assigned).toBe(false);
      expect(result.courier).toBeNull();
      expect(mockPrisma.staffUser.findUnique).not.toHaveBeenCalled();
    });

    it('should return unassigned when courier not found in staff table', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        userId: 'user-1',
        courierId: 'ghost-co',
      });
      mockPrisma.staffUser.findUnique.mockResolvedValue(null);

      const result = await service.getMyOrderCourierInfo('user-1', 'ord-3');

      expect(result.assigned).toBe(false);
      expect(result.courier).toBeNull();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.getMyOrderCourierInfo('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when userId does not match', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        userId: 'other-user',
        courierId: 'co-1',
      });

      await expect(
        service.getMyOrderCourierInfo('user-1', 'ord-5'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle courier with WALKING transport type', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        userId: 'user-1',
        courierId: 'co-walker',
      });
      mockPrisma.staffUser.findUnique.mockResolvedValue({
        id: 'co-walker',
        name: 'Петя',
        transportType: 'WALKING',
        lastLatitude: 55.01,
        lastLongitude: 73.25,
        lastLocationAt: new Date('2026-06-24T09:30:00Z'),
      });

      const result = await service.getMyOrderCourierInfo('user-1', 'ord-walk');

      expect(result.courier!.transportType).toBe('WALKING');
    });
  });

  describe('getMyOrderById', () => {
    const sampleOrder = {
      id: 'ord-1', number: 1001, status: 'NEW', total: 120000,
      itemsTotal: 110000, deliveryCost: 10000,
      deliveryMode: 'DELIVERY', paymentMethod: 'CASH',
      customerName: 'Иван', customerPhone: '+79001234567',
      customerEmail: 'ivan@example.com', address: 'ул. Ленина, 1',
      desiredTime: '14:00', comment: null, createdAt: new Date('2026-06-24T12:00:00Z'),
      userId: 'user-1',
      items: [{ id: 'item-1', nameSnapshot: 'Борщ', priceSnapshot: 55000, qty: 2 }],
      statusLogs: [{ status: 'NEW', createdAt: new Date('2026-06-24T12:00:00Z') }],
    };

    it('should return order when user owns it', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      const result = await service.getMyOrderById('user-1', 'ord-1');
      expect(result.id).toBe('ord-1');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.getMyOrderById('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when userId does not match', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...sampleOrder, userId: 'other-user' });
      await expect(
        service.getMyOrderById('user-1', 'ord-1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
