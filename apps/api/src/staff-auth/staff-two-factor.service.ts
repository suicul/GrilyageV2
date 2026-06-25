import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as speakeasy from 'speakeasy';

@Injectable()
export class StaffTwoFactorService {
  private readonly logger = new Logger(StaffTwoFactorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new TOTP secret and return it along with the otpauth URI.
   * Does NOT persist the secret — call enable() to confirm and store.
   */
  async setup(staffId: string, login: string) {
    const secret = speakeasy.generateSecret({ name: `Грильяж (${login})` });
    const uri = secret.otpauth_url;

    if (!uri) {
      throw new BadRequestException('Не удалось создать QR-код');
    }

    return { secret: secret.base32, uri };
  }

  /**
   * Verify a TOTP code against the provided secret and persist it.
   * Enables 2FA for the staff member.
   */
  async enable(staffId: string, secret: string, code: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!staff) throw new BadRequestException('Сотрудник не найден');
    if (staff.totpSecret) throw new BadRequestException('2FA уже включена');

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Неверный код подтверждения');
    }

    await this.prisma.staffUser.update({
      where: { id: staffId },
      data: { totpSecret: secret },
    });

    return { message: '2FA включена' };
  }

  /**
   * Disable 2FA for a staff member by removing the stored secret.
   */
  async disable(staffId: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!staff) throw new BadRequestException('Сотрудник не найден');
    if (!staff.totpSecret) throw new BadRequestException('2FA не включена');

    await this.prisma.staffUser.update({
      where: { id: staffId },
      data: { totpSecret: null },
    });

    return { message: '2FA отключена' };
  }

  /**
   * Check whether 2FA is enabled for the given staff member.
   */
  async isEnabled(staffId: string): Promise<boolean> {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffId },
      select: { totpSecret: true },
    });
    return !!staff?.totpSecret;
  }

  /**
   * Verify a TOTP code against the stored secret.
   */
  async verifyCode(staffId: string, code: string): Promise<boolean> {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffId },
      select: { totpSecret: true },
    });
    if (!staff?.totpSecret) return false;

    return speakeasy.totp.verify({
      secret: staff.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }
}
