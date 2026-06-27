import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req, Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { AdminService } from './admin.service';
import { StaffRolesGuard, Roles } from '../staff-auth/staff-roles.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { StaffRole } from '@prisma/client';
import {
  CreateCategoryDto, UpdateCategoryDto, UpdateOrderStatusDto,
  CreatePromotionDto, UpdatePromotionDto,
  CreateStaffUserDto, UpdateStaffUserDto,
  CreateSubcategoryDto, UpdateSubcategoryDto,
  CreateProductDto, UpdateProductDto,
  AssignCourierDto, UpdateCourierLocationDto,
} from './admin.dto';

@UseGuards(StaffRolesGuard, CsrfGuard)
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
  listProducts(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.admin.listProducts(Number(skip) || 0, Number(take) || 50);
  }

  @Roles(StaffRole.ADMIN)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.admin.createProduct(dto);
  }

  @Roles(StaffRole.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
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
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @Get('users')
  listStaffUsers() {
    return this.admin.listStaffUsers();
  }

  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @Post('users')
  createStaffUser(@Body() dto: CreateStaffUserDto) {
    return this.admin.createStaffUser(dto);
  }

  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
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
  @SkipThrottle()
  @Post('uploads/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          const dir = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', '..', '..', 'uploads');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не загружен');

    // Convert to WebP, resize to 800px max width
    const outputPath = file.path;
    const tempPath = outputPath.replace('.webp', '-orig.webp');
    fs.renameSync(outputPath, tempPath);

    try {
      await sharp(tempPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outputPath);

      // Also create a thumbnail
      const thumbPath = outputPath.replace('.webp', '-thumb.webp');
      await sharp(tempPath)
        .resize(320, 320, { fit: 'cover' })
        .webp({ quality: 70 })
        .toFile(thumbPath);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    const url = `/uploads/${path.basename(outputPath)}`;
    return { url, message: 'Файл загружен' };
  }

  /* ─── Dashboard ─── */
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('dashboard')
  getDashboardStats() {
    return this.admin.getDashboardStats();
  }

  /* ─── Orders ─── */
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR, StaffRole.COURIER)
  @Get('orders/courier')
  listCourierOrders(@Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.admin.listCourierOrders(staff.sub);
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders')
  listOrders(@Query('status') status?: string, @Query('date') date?: string, @Query('search') search?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.admin.listOrders({ status, date, search, skip: Number(skip) || 0, take: Number(take) || 50 });
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders/export')
  async exportOrders(
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('search') search?: string,
    @Res() res?: any,
  ) {
    const csv = await this.admin.exportOrders({ status, date, search });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    // Add BOM for Excel to recognise UTF-8
    res.send('\ufeff' + csv);
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.admin.getOrder(id);
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR, StaffRole.COURIER)
  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.admin.updateOrderStatus(id, dto, staff.sub);
  }

  /* ─── Courier Assignment ─── */
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Post('orders/:id/assign')
  assignCourier(@Param('id') id: string, @Body() dto: AssignCourierDto) {
    return this.admin.assignCourier(id, dto);
  }

  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('orders/:id/nearest-courier')
  findNearestCourier(@Param('id') id: string) {
    return this.admin.findNearestCourier(id);
  }

  /* ─── Courier Location (GPS tracking) ─── */
  @Roles(StaffRole.COURIER)
  @Patch('location')
  updateLocation(@Req() req: Request, @Body() dto: UpdateCourierLocationDto) {
    const staff = req.user as { sub: string };
    return this.admin.updateCourierLocation(staff.sub, dto);
  }
}
