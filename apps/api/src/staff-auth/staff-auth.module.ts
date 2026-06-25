import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffJwtStrategy } from './staff-jwt.strategy';
import { StaffTwoFactorService } from './staff-two-factor.service';
import { CsrfService } from '../common/csrf.service';
import { CsrfGuard } from '../common/csrf.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'staff-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
        signOptions: {
          expiresIn: config.get<string>('STAFF_JWT_ACCESS_TTL', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [StaffAuthController],
  providers: [StaffAuthService, StaffJwtStrategy, StaffTwoFactorService, CsrfService, CsrfGuard],
  exports: [StaffAuthService, StaffJwtStrategy, StaffTwoFactorService, PassportModule, CsrfService, CsrfGuard],
})
export class StaffAuthModule {}
