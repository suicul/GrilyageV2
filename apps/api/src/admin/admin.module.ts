import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import { OrdersModule } from '../orders/orders.module';
import { GeocoderService } from '../common/geocoder.service';

@Module({
  imports: [StaffAuthModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminService, GeocoderService],
})
export class AdminModule {}
