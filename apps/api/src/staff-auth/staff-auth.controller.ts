import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';
import { StaffLoginDto, StaffRefreshDto } from './dto/staff-auth.dto';
import { StaffJwtGuard } from './staff-jwt.guard';
import { Request } from 'express';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: StaffLoginDto) {
    return this.staffAuthService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: StaffRefreshDto) {
    return this.staffAuthService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: StaffRefreshDto) {
    await this.staffAuthService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(StaffJwtGuard)
  async getProfile(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.staffAuthService.getProfile(user.sub);
  }
}
