import { Test, TestingModule } from '@nestjs/testing';
import { StaffAuthService } from './staff-auth.service';
import { StaffTwoFactorService } from './staff-two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

describe('StaffAuthService', () => {
  let service: StaffAuthService;

  const staffUser = {
    id: 'staff-1',
    login: 'admin',
    name: 'Admin',
    passwordHash: '',
    role: 'ADMIN' as any,
    active: true,
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
  };

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
    staffUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-staff-access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'STAFF_JWT_ACCESS_SECRET') return 'staff-secret';
      if (key === 'JWT_REFRESH_TTL') return '30d';
      return defaultValue;
    }),
  };

  const mockTwoFactorService = {
    isEnabled: jest.fn().mockResolvedValue(false),
    verifyCode: jest.fn(),
    setup: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StaffTwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<StaffAuthService>(StaffAuthService);
    jest.clearAllMocks();
    staffUser.passwordHash = await bcrypt.hash('admin123', 12);
  });

  it('should login with valid credentials', async () => {
    mockPrisma.staffUser.findUnique.mockResolvedValue(staffUser);
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const result = await service.login({ login: 'admin', password: 'admin123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('should throw on invalid password', async () => {
    mockPrisma.staffUser.findUnique.mockResolvedValue(staffUser);

    await expect(
      service.login({ login: 'admin', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw on inactive user', async () => {
    mockPrisma.staffUser.findUnique.mockResolvedValue({ ...staffUser, active: false });

    await expect(
      service.login({ login: 'admin', password: 'admin123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should refresh tokens', async () => {
    const rt = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha256').update(rt).digest('hex');
    const future = new Date();
    future.setDate(future.getDate() + 30);

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      staffUserId: 'staff-1',
      tokenHash: hash,
      expiresAt: future,
      revokedAt: null,
    });
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.staffUser.findUnique.mockResolvedValue(staffUser);
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const result = await service.refresh(rt);
    expect(result).toHaveProperty('accessToken');
  });

  it('should get profile', async () => {
    mockPrisma.staffUser.findUnique.mockResolvedValue({
      id: 'staff-1',
      login: 'admin',
      name: 'Admin',
      role: 'ADMIN',
      active: true,
    });

    const profile = await service.getProfile('staff-1');
    expect(profile.login).toBe('admin');
  });
});
