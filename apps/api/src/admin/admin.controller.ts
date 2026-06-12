import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { StaffRolesGuard, Roles } from '../staff-auth/staff-roles.guard';
import { StaffRole } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto, UpdateOrderStatusDto } from './admin.dto';

@UseGuards(StaffRolesGuard)
@Controller('staff')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /* ─── Categories ─── */
  @Roles(StaffRole.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.admin.updateCategory(id, dto);
  }

  @Roles(StaffRole.ADMIN)
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  /* ─── Products ─── */
  @Roles(StaffRole.ADMIN)
  @Post('products')
  createProduct(@Body() dto: any) {
    return this.admin.createProduct(dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.admin.updateProduct(id, dto);
  }

  @Roles(StaffRole.ADMIN)
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.admin.deleteProduct(id);
  }

  /* ─── Orders ─── */
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders')
  listOrders() {
    return this.admin.listOrders();
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.admin.getOrder(id);
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto);
  }
}
