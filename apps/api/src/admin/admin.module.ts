import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [StaffAuthModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
