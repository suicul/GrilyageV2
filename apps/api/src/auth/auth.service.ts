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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const raw = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    this.refreshTtl = this.parseTtl(raw);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
      },
    });

    await this.createEmailToken(user.id, 'VERIFY');

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId! },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user.id, user.email);
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
    const emailToken = await this.prisma.emailToken.findUnique({
      where: { token: hash },
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid verification token');
    }
    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }
    if (emailToken.type !== 'VERIFY') {
      throw new BadRequestException('Invalid token type');
    }

    await this.prisma.user.update({
      where: { id: emailToken.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await this.prisma.emailToken.delete({
      where: { id: emailToken.id },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    await this.prisma.emailToken.deleteMany({
      where: { userId: user.id, type: 'VERIFY' },
    });

    await this.createEmailToken(user.id, 'VERIFY');
    return { message: 'Verification email sent' };
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
      throw new NotFoundException('User not found');
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
