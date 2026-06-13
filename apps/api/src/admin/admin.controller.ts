import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AdminService } from './admin.service';
import { StaffRolesGuard, Roles } from '../staff-auth/staff-roles.guard';
import { StaffRole } from '@prisma/client';
import {
  CreateCategoryDto, UpdateCategoryDto, UpdateOrderStatusDto,
  CreatePromotionDto, UpdatePromotionDto,
  CreateStaffUserDto, UpdateStaffUserDto,
  CreateSubcategoryDto, UpdateSubcategoryDto,
} from './admin.dto';

@UseGuards(StaffRolesGuard)
@Controller('staff')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /* ─── Categories ─── */
  @Roles(StaffRole.ADMIN)
  @Get('categories')
  listCategories() {
    return this.admin.listCategories();
  }

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

  /* ─── Subcategories ─── */
  @Roles(StaffRole.ADMIN)
  @Post('categories/:id/subcategories')
  createSubcategory(@Param('id') categoryId: string, @Body() dto: CreateSubcategoryDto) {
    return this.admin.createSubcategory(categoryId, dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('subcategories/:id')
  updateSubcategory(@Param('id') id: string, @Body() dto: UpdateSubcategoryDto) {
    return this.admin.updateSubcategory(id, dto);
  }

  @Roles(StaffRole.ADMIN)
  @Delete('subcategories/:id')
  deleteSubcategory(@Param('id') id: string) {
    return this.admin.deleteSubcategory(id);
  }

  /* ─── Products ─── */
  @Roles(StaffRole.ADMIN)
  @Get('products')
  listProducts() {
    return this.admin.listProducts();
  }

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

  /* ─── Promotions ─── */
  @Roles(StaffRole.ADMIN)
  @Get('promotions')
  listPromotions() {
    return this.admin.listPromotions();
  }

  @Roles(StaffRole.ADMIN)
  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.admin.createPromotion(dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.admin.updatePromotion(id, dto);
  }

  @Roles(StaffRole.ADMIN)
  @Delete('promotions/:id')
  deletePromotion(@Param('id') id: string) {
    return this.admin.deletePromotion(id);
  }

  /* ─── Staff Users ─── */
  @Roles(StaffRole.ADMIN)
  @Get('users')
  listStaffUsers() {
    return this.admin.listStaffUsers();
  }

  @Roles(StaffRole.ADMIN)
  @Post('users')
  createStaffUser(@Body() dto: CreateStaffUserDto) {
    return this.admin.createStaffUser(dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('users/:id')
  updateStaffUser(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.admin.updateStaffUser(id, dto);
  }

  /* ─── Uploads ─── */
  @Roles(StaffRole.ADMIN)
  @Post('uploads/image')
  uploadImage(@Body() dto: { url: string }) {
    return this.admin.saveImageFromUrl(dto.url);
  }

  @Roles(StaffRole.ADMIN)
  @Post('uploads/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = path.resolve(__dirname, '..', '..', '..', 'uploads');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname) || '.jpg';
          const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не загружен');
    const url = `/uploads/${file.filename}`;
    return { url, message: 'Файл загружен' };
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
