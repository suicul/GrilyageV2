import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every hour — delete expired, unused OTP codes.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps() {
    const now = new Date();
    const { count } = await this.prisma.otpCode.deleteMany({
      where: {
        expiresAt: { lt: now },
        usedAt: null,
      },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired OTP code(s)`);
    }
  }

  /**
   * Every day at 03:00 — delete refresh tokens that are expired
   * or were revoked more than 7 days ago.
   */
  @Cron('0 3 * * *')
  async cleanupRefreshTokens() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: cutoff } },
        ],
      },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} refresh token(s)`);
    }
  }

  /**
   * Every day at 04:00 — auto-deactivate promotions past their end date.
   */
  @Cron('0 4 * * *')
  async deactivateExpiredPromotions() {
    const now = new Date();
    const { count } = await this.prisma.promotion.updateMany({
      where: {
        endsAt: { lt: now },
        active: true,
      },
      data: { active: false },
    });
    if (count > 0) {
      this.logger.log(`Deactivated ${count} expired promotion(s)`);
    }
  }
}
