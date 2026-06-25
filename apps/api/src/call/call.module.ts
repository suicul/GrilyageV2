import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';
import { AuthModule } from '../auth/auth.module';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';

@Module({
  imports: [AuthModule, StaffAuthModule],
  controllers: [CallController],
  providers: [
    CallService,
    CallGateway,
    {
      provide: 'STAFF_JWT_SERVICE',
      useFactory: (config: ConfigService) => new JwtService({
        secret: config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [CallGateway],
})
export class CallModule {}
