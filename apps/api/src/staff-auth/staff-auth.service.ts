import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { StaffLoginDto } from './dto/staff-auth.dto';
import { StaffTwoFactorService } from './staff-two-factor.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class StaffAuthService {
  private readonly logger = new Logger(StaffAuthService.name);
  private readonly maxLoginAttempts = 5;
  private readonly lockoutMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly twoFactorService: StaffTwoFactorService,
  ) {}

  async login(dto: StaffLoginDto) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { login: dto.login },
    });

    if (!staff) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    // Check if account is locked
    if (staff.lockedUntil && staff.lockedUntil > new Date()) {
      const remaining = Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Аккаунт заблокирован. Попробуйте через ${remaining} мин.`,
      );
    }

    // Reset lockout if lockout period has expired
    if (staff.lockedUntil && staff.lockedUntil <= new Date()) {
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    if (!staff.active) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) {
      const newAttempts = staff.loginAttempts + 1;
      if (newAttempts >= this.maxLoginAttempts) {
        const lockedUntil = new Date(Date.now() + this.lockoutMinutes * 60 * 1000);
        await this.prisma.staffUser.update({
          where: { id: staff.id },
          data: { loginAttempts: newAttempts, lockedUntil },
        });
        throw new UnauthorizedException(
          `Аккаунт заблокирован на ${this.lockoutMinutes} мин. за слишком много неудачных попыток.`,
        );
      }
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: { loginAttempts: newAttempts },
      });
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    // Successful login — reset attempts
    if (staff.loginAttempts > 0) {
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    // If 2FA is enabled, return a challenge token instead of the full token pair
    if (await this.twoFactorService.isEnabled(staff.id)) {
      const challengeToken = this.jwtService.sign(
        { sub: staff.id, type: '2fa-challenge' },
        {
          secret: this.config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
          expiresIn: '5m',
        },
      );
      return { requires2fa: true, challengeToken };
    }

    return this.generateTokenPair(staff.id, staff.login, staff.role);
  }

  /**
   * Complete a 2FA login by verifying the challenge token and TOTP code.
   */
  async completeLogin(challengeToken: string, code: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(challengeToken, {
        secret: this.config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
      }) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException('Недействительный или истёкший токен подтверждения');
    }

    if (payload.type !== '2fa-challenge') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    const staff = await this.prisma.staffUser.findUnique({ where: { id: payload.sub } });
    if (!staff || !staff.active) {
      throw new UnauthorizedException('Сотрудник не найден или деактивирован');
    }

    const verified = await this.twoFactorService.verifyCode(staff.id, code);
    if (!verified) {
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    return this.generateTokenPair(staff.id, staff.login, staff.role);
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
      if (!stored.staffUserId) {
        throw new UnauthorizedException('Неверный тип токена');
      }

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const staff = await tx.staffUser.findUnique({
        where: { id: stored.staffUserId },
      });
      if (!staff || !staff.active) {
        throw new UnauthorizedException('Сотрудник не найден или деактивирован');
      }

      return this.generateTokenPair(staff.id, staff.login, staff.role);
    });
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
      throw new UnauthorizedException('Сотрудник не найден');
    }
    return staff;
  }

  async generateTokenPair(userId: string, login: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, login, role },
      { secret: this.config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access') },
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    const rawTtl = this.config.get<string>('STAFF_JWT_REFRESH_TTL', '30d');
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
