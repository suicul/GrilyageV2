import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { SocialAuthModule } from '../social-auth/social-auth.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { MobileGateway } from './mobile.gateway';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'change-me-user-access'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as any,
        },
      }),
    }),
    SocialAuthModule,
  ],
  controllers: [MobileController],
  providers: [MobileService, MobileGateway],
})
export class MobileModule {}
