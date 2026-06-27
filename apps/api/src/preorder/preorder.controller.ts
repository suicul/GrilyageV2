import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PreorderService } from './preorder.service';
import { CreatePreorderDto } from './preorder.dto';
import { StaffRolesGuard, Roles } from '../staff-auth/staff-roles.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { StaffRole } from '@prisma/client';

@Controller()
export class PreorderController {
  constructor(private readonly preorder: PreorderService) {}

  /* Public: anyone can create a preorder */
  @SkipThrottle()
  @Post('preorder')
  create(@Body() dto: CreatePreorderDto, @Req() req: Request) {
    const userId = (req.user as any)?.sub as string | undefined;
    return this.preorder.create(dto, userId);
  }

  /* Staff: list / confirm / cancel */
  @UseGuards(StaffRolesGuard, CsrfGuard)
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Get('staff/preorders')
  list(@Query('status') status?: string) {
    return this.preorder.list(status);
  }

  @UseGuards(StaffRolesGuard, CsrfGuard)
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Patch('staff/preorders/:id/confirm')
  confirm(@Param('id') id: string) {
    return this.preorder.confirm(id);
  }

  @UseGuards(StaffRolesGuard, CsrfGuard)
  @Roles(StaffRole.ADMIN, StaffRole.OPERATOR)
  @Patch('staff/preorders/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.preorder.cancel(id);
  }
}
