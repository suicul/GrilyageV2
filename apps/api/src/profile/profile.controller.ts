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
  Headers,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SaveConsentDto } from './dto/consent.dto';
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

  /* ─── Consent ─── */
  @SkipThrottle()
  @Get('consent')
  async getConsent(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.profileService.getConsent(user.sub);
  }

  @SkipThrottle()
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async saveConsent(
    @Body() dto: SaveConsentDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const user = req.user as { sub: string };
    const ip = (req.ip ?? req.socket?.remoteAddress) || undefined;
    return this.profileService.saveConsent(user.sub, dto, ip, userAgent);
  }
}
