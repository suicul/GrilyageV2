import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should call authService.register and return user', async () => {
      const dto = { email: 'test@example.com', password: 'password123', name: 'Test' };
      const expected = { id: 'u1', email: 'test@example.com', name: 'Test' };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(result).toEqual(expected);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto, undefined);
    });
  });

  describe('POST /auth/login', () => {
    it('should return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens', async () => {
      const expected = { accessToken: 'new-at', refreshToken: 'new-rt' };
      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh({ refreshToken: 'rt' });
      expect(result).toEqual(expected);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('rt');
    });
  });

  describe('POST /auth/logout', () => {
    it('should call logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const mockRes = { clearCookie: jest.fn() } as any;
      const result = await controller.logout({ refreshToken: 'rt' }, mockRes);
      expect(result).toBeUndefined();
      expect(mockAuthService.logout).toHaveBeenCalledWith('rt');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
    });
  });

  describe('GET /auth/verify-email', () => {
    it('should verify email', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ message: 'Email подтверждён' });

      const result = await controller.verifyEmail('token123');
      expect(result).toEqual({ message: 'Email подтверждён' });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('token123');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification', async () => {
      mockAuthService.resendVerification.mockResolvedValue({ message: 'Письмо для подтверждения отправлено' });

      const result = await controller.resendVerification({ email: 'test@example.com' });
      expect(result).toEqual({ message: 'Письмо для подтверждения отправлено' });
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile', async () => {
      const expected = { id: 'u1', email: 'test@example.com' };
      mockAuthService.getProfile.mockResolvedValue(expected);
      const req = { user: { sub: 'u1' } } as any;

      const result = await controller.getProfile(req);
      expect(result).toEqual(expected);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('u1');
    });
  });
});
