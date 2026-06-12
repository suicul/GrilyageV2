import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffJwtGuard } from '../staff-auth/staff-jwt.guard';
import { StaffRolesGuard, Roles } from '../staff-auth/staff-roles.guard';
import { Request } from 'express';
import { StaffRole } from '@prisma/client';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Public — anyone can create an order
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user as { sub: string } | undefined;
    return this.ordersService.create(dto, user?.sub);
  }

  @Get('orders/my')
  @UseGuards(JwtAuthGuard)
  async findMyOrders(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.ordersService.findMyOrders(user.sub);
  }

  @Get('orders/my/:id')
  @UseGuards(JwtAuthGuard)
  async findMyOrderById(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { sub: string };
    return this.ordersService.findMyOrderById(user.sub, id);
  }

  // Staff endpoints
  @Get('staff/orders')
  @UseGuards(StaffJwtGuard)
  async findAll(@Query('status') status?: string, @Query('date') date?: string) {
    return this.ordersService.findAll({ status, date });
  }

  @Get('staff/orders/:id')
  @UseGuards(StaffJwtGuard)
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('staff/orders/:id/status')
  @UseGuards(StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    const staff = req.user as { sub: string };
    return this.ordersService.updateStatus(id, dto, staff.sub);
  }
}
