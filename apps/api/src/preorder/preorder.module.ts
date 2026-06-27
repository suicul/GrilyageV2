import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import { PreorderController } from './preorder.controller';
import { PreorderService } from './preorder.service';

@Module({
  imports: [PrismaModule, StaffAuthModule],
  controllers: [PreorderController],
  providers: [PreorderService],
})
export class PreorderModule {}
