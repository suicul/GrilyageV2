import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { UserOrdersGateway } from './user-orders.gateway';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PushModule,
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
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersGateway,
    UserOrdersGateway,
    {
      provide: 'STAFF_JWT_SERVICE',
      useFactory: (config: ConfigService) => new JwtService({
        secret: config.get<string>('STAFF_JWT_ACCESS_SECRET', 'change-me-staff-access'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [OrdersGateway, UserOrdersGateway],
})
export class OrdersModule {}
