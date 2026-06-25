import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.staffAccessToken ?? null;
};

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
    });
  }

  async validate(payload: { sub: string; login: string; role: string }) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, login: true, role: true, active: true },
    });
    if (!staff || !staff.active) {
      throw new UnauthorizedException('Сотрудник не найден или деактивирован');
    }
    return { sub: staff.id, login: staff.login, role: staff.role };
  }
}
