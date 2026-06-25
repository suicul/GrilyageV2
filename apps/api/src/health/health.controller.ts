import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', uptime: process.uptime(), db: 'connected' };
    } catch (err) {
      this.logger.error('Health check — DB not reachable', err);
      return { status: 'error', uptime: process.uptime(), db: 'disconnected' };
    }
  }
}
