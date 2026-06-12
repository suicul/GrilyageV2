import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { StaffAuthModule } from './staff-auth/staff-auth.module';
import { OrdersModule } from './orders/orders.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
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
  ],
})
export class AppModule {}
