import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { StaffAuthModule } from './staff-auth/staff-auth.module';
import { OrdersModule } from './orders/orders.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';
import { SocialAuthModule } from './social-auth/social-auth.module';
import { MobileModule } from './mobile/mobile.module';
import { CallModule } from './call/call.module';
import { ChatModule } from './chat/chat.module';
import { PushModule } from './push/push.module';
import { AccessTokenCookieInterceptor } from './common/access-token-cookie.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 10000, limit: 20 },
        { name: 'long', ttl: 60000, limit: 100 },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    StaffAuthModule,
    OrdersModule,
    EmailModule,
    AdminModule,
    ProfileModule,
    SocialAuthModule,
    MobileModule,
    CallModule,
    ChatModule,
    PushModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AccessTokenCookieInterceptor },
  ],
})
export class AppModule {}
