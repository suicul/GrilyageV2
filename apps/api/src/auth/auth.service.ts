import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtl: number;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const raw = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    this.refreshTtl = this.parseTtl(raw);
  }

  async register(dto: RegisterDto, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Этот email уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');
    const activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
        isActive: false,
        activationToken: activationTokenHash,
        activationTokenExpiresAt,
      },
    });

    // Create consent record (152-ФЗ)
    await this.prisma.userConsent.create({
      data: {
        userId: user.id,
        userAgent: userAgent ?? null,
      },
    });

    await this.emailService.sendVerificationEmail(dto.email, activationToken);

    const { passwordHash: _, activationToken: __, activationTokenExpiresAt: ___, ...result } = user;
    return { ...result, message: 'Письмо для активации отправлено на ваш email' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Аккаунт заблокирован. Попробуйте через ${remaining} мин.`,
      );
    }

    // Reset lockout if lockout period has expired
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Email не подтверждён. Проверьте почту или запросите новое письмо');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash!);
    if (!valid) {
      const newAttempts = user.loginAttempts + 1;
      if (newAttempts >= this.maxLoginAttempts) {
        const lockedUntil = new Date(Date.now() + this.lockoutMinutes * 60 * 1000);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: newAttempts, lockedUntil },
        });
        throw new UnauthorizedException(
          `Аккаунт заблокирован на ${this.lockoutMinutes} мин. за слишком много неудачных попыток.`,
        );
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts },
      });
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Successful login — reset attempts
    if (user.loginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    return this.generateTokenPair(user.id, user.email ?? '');
  }

  async refresh(refreshToken: string) {
    return this.prisma.$transaction(async (tx) => {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash: hash },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Токен обновления недействителен или истёк');
      }

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const user = await tx.user.findUnique({
        where: { id: stored.userId! },
      });
      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      return this.generateTokenPair(user.id, user.email ?? '');
    });
  }

  async logout(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { activationToken: hash },
    });

    if (!user) {
      throw new BadRequestException('Недействительный токен подтверждения');
    }
    if (!user.activationTokenExpiresAt || user.activationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Срок действия токена подтверждения истёк');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerifiedAt: new Date(),
        activationToken: null,
        activationTokenExpiresAt: null,
      },
    });

    return { message: 'Email подтверждён' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email уже подтверждён');
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');
    const activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        activationToken: activationTokenHash,
        activationTokenExpiresAt,
      },
    });

    if (user.email) await this.emailService.sendVerificationEmail(user.email, activationToken);
    return { message: 'Письмо для подтверждения отправлено' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  private async generateTokenPair(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async createEmailToken(userId: string, type: 'VERIFY' | 'RESET') {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailToken.create({
      data: {
        userId,
        token: hash,
        type,
        expiresAt,
      },
    });

    return rawToken;
  }

  private parseTtl(raw: string): number {
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60; // default 30d in seconds
    const val = parseInt(match[1]!, 10);
    switch (match[2]) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 30 * 24 * 60 * 60;
    }
  }
}
