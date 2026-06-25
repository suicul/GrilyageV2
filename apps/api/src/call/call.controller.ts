import { Controller, Post, Get, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffJwtGuard } from '../staff-auth/staff-jwt.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { Request } from 'express';

@UseGuards(CsrfGuard)
@Controller()
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('calls/enqueue')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async enqueue(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.callService.enqueue(user.sub);
  }

  @Post('calls/dequeue')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async dequeue(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.callService.dequeue(user.sub);
  }

  @Post('calls/:id/accept')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async accept(@Param('id') id: string, @Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.callService.accept(id, staff.sub);
  }

  @Post('calls/:id/connect')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async connect(@Param('id') id: string) {
    return this.callService.connect(id);
  }

  @Post('calls/:id/end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async end(@Param('id') id: string) {
    return this.callService.end(id);
  }

  @Get('calls/queue')
  @UseGuards(StaffJwtGuard)
  async getQueue() {
    return this.callService.getQueue();
  }
}
