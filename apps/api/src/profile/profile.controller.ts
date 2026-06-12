import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.profileService.updateProfile(user.sub, dto);
  }

  @Get('addresses')
  async findAddresses(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.profileService.findAddresses(user.sub);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Body() dto: CreateAddressDto, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.profileService.createAddress(user.sub, dto);
  }

  @Patch('addresses/:id')
  @HttpCode(HttpStatus.OK)
  async updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    return this.profileService.updateAddress(user.sub, id, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    await this.profileService.deleteAddress(user.sub, id);
  }
}
