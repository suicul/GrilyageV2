import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { StaffLoginDto } from './dto/staff-auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class StaffAuthService {
  private readonly logger = new Logger(StaffAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: StaffLoginDto) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { login: dto.login },
    });

    if (!staff || !staff.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(staff.id, staff.login, staff.role);
  }

  async refresh(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!stored.staffUserId) {
      throw new UnauthorizedException('Invalid token type');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const staff = await this.prisma.staffUser.findUnique({
      where: { id: stored.staffUserId },
    });
    if (!staff || !staff.active) {
      throw new UnauthorizedException('Staff not found or inactive');
    }

    return this.generateTokenPair(staff.id, staff.login, staff.role);
  }

  async logout(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(staffUserId: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffUserId },
      select: { id: true, login: true, name: true, role: true, active: true },
    });
    if (!staff) {
      throw new UnauthorizedException('Staff not found');
    }
    return staff;
  }

  private async generateTokenPair(userId: string, login: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, login, role },
      { secret: this.config.get<string>('STAFF_JWT_ACCESS_SECRET') },
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    const rawTtl = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    const ttl = this.parseTtl(rawTtl);
    expiresAt.setSeconds(expiresAt.getSeconds() + ttl);

    await this.prisma.refreshToken.create({
      data: {
        staffUserId: userId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private parseTtl(raw: string): number {
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(match[1]!, 10) * (multipliers[match[2]!] ?? 1);
  }
}
