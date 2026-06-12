import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
      throw new UnauthorizedException('Staff not found or inactive');
    }
    return { sub: staff.id, login: staff.login, role: staff.role };
  }
}
