import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';

@Module({
  imports: [AuthModule, StaffAuthModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    {
      provide: 'USER_JWT_SERVICE',
      useFactory: (config: ConfigService) => new JwtService({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'change-me-user-access'),
      }),
      inject: [ConfigService],
    },
    {
      provide: 'STAFF_JWT_SERVICE',
      useFactory: (config: ConfigService) => new JwtService({
        secret: config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [ChatGateway],
})
export class ChatModule {}
