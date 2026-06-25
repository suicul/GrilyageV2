import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserOrdersGateway } from './user-orders.gateway';

describe('UserOrdersGateway', () => {
  let gateway: UserOrdersGateway;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  function createMockSocket(overrides: any = {}) {
    return {
      id: 'sock-1',
      handshake: { auth: {}, query: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      ...overrides,
    };
  }

  let mockJwtService: { verifyAsync: jest.Mock };

  beforeEach(async () => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOrdersGateway,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<UserOrdersGateway>(UserOrdersGateway);
    (gateway as any).server = mockServer;
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate with valid token from handshake auth', async () => {
      const socket = createMockSocket({
        handshake: { auth: { token: 'valid.jwt.token' }, query: {} },
      });
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(socket as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token');
      expect((socket as any).userId).toBe('user-123');
      expect(socket.emit).not.toHaveBeenCalledWith('error', expect.anything());
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate with valid token from query param', async () => {
      const socket = createMockSocket({
        handshake: { auth: {}, query: { token: 'query.jwt.token' } },
      });
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-456' });

      await gateway.handleConnection(socket as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('query.jwt.token');
      expect((socket as any).userId).toBe('user-456');
    });

    it('should prefer auth.token over query.token', async () => {
      const socket = createMockSocket({
        handshake: { auth: { token: 'auth.token' }, query: { token: 'query.token' } },
      });
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-auth' });

      await gateway.handleConnection(socket as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('auth.token');
    });

    it('should reject when no token provided', async () => {
      const socket = createMockSocket();

      await gateway.handleConnection(socket as any);

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Требуется авторизация' });
      expect(socket.disconnect).toHaveBeenCalled();
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should reject when token is invalid (verifyAsync throws)', async () => {
      const socket = createMockSocket({
        handshake: { auth: { token: 'bad.token' }, query: {} },
      });
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await gateway.handleConnection(socket as any);

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Неверный токен' });
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should reject when verifyAsync rejects with any error', async () => {
      const socket = createMockSocket({
        handshake: { auth: { token: 'expired.token' }, query: {} },
      });
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException('Token expired'));

      await gateway.handleConnection(socket as any);

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Неверный токен' });
      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', () => {
      const socket = createMockSocket();

      gateway.handleDisconnect(socket as any);

      // No error thrown — just logging
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscribe', () => {
    it('should join client to order room', () => {
      const socket = createMockSocket();

      gateway.handleSubscribe(socket as any, { orderId: 'ord-123' });

      expect(socket.join).toHaveBeenCalledWith('order:ord-123');
    });

    it('should join different rooms for different orders', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket({ id: 'sock-2' });

      gateway.handleSubscribe(socket1 as any, { orderId: 'ord-1' });
      gateway.handleSubscribe(socket2 as any, { orderId: 'ord-2' });

      expect(socket1.join).toHaveBeenCalledWith('order:ord-1');
      expect(socket2.join).toHaveBeenCalledWith('order:ord-2');
    });
  });

  describe('handleUnsubscribe', () => {
    it('should remove client from order room', () => {
      const socket = createMockSocket();

      gateway.handleUnsubscribe(socket as any, { orderId: 'ord-456' });

      expect(socket.leave).toHaveBeenCalledWith('order:ord-456');
    });
  });

  describe('notifyCourierLocation', () => {
    it('should emit courier.location to correct order room', () => {
      const location = { latitude: 54.98, longitude: 73.38 };

      gateway.notifyCourierLocation('ord-1', location);

      expect(mockServer.to).toHaveBeenCalledWith('order:ord-1');
      expect(mockServer.emit).toHaveBeenCalledWith('courier.location', {
        orderId: 'ord-1',
        latitude: 54.98,
        longitude: 73.38,
      });
    });

    it('should not throw when server is undefined', () => {
      const g = new UserOrdersGateway(mockJwtService as any);

      expect(() => {
        g.notifyCourierLocation('ord-1', { latitude: 1, longitude: 2 });
      }).not.toThrow();
    });
  });

  describe('notifyOrderUpdated', () => {
    it('should emit order.updated to correct order room', () => {
      const order = { id: 'ord-1', status: 'DELIVERING' };

      gateway.notifyOrderUpdated('ord-1', order);

      expect(mockServer.to).toHaveBeenCalledWith('order:ord-1');
      expect(mockServer.emit).toHaveBeenCalledWith('order.updated', order);
    });

    it('should not throw when server is undefined', () => {
      const g = new UserOrdersGateway(mockJwtService as any);

      expect(() => {
        g.notifyOrderUpdated('ord-1', { id: 'ord-1' });
      }).not.toThrow();
    });
  });
});
