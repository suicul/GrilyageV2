import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffJwtStrategy } from './staff-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'staff-jwt' }),
    JwtModule.register({
      secret: process.env.STAFF_JWT_ACCESS_SECRET || 'change-me-staff-access',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [StaffAuthController],
  providers: [StaffAuthService, StaffJwtStrategy],
  exports: [StaffAuthService, StaffJwtStrategy, PassportModule],
})
export class StaffAuthModule {}
