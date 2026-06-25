import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

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
}
