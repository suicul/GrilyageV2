import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { MobileService } from './mobile.service';
import { MobileLoginDto } from './dto/mobile-login.dto';
import { MobileRegisterDto } from './dto/mobile-register.dto';
import { MobileRefreshDto } from './dto/mobile-refresh.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { CompleteAuthDto } from './dto/complete-auth.dto';
import { CheckAuthResultDto } from './dto/check-auth-result.dto';
import { SocialVkDto } from './dto/social-vk.dto';
import { SocialYandexDto } from './dto/social-yandex.dto';
import { SocialTelegramDto } from './dto/social-telegram.dto';
import { SocialEmailOtpDto } from './dto/social-email-otp.dto';
import { SendEmailOtpDto } from './dto/send-email-otp.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { RegisterPushDto } from './dto/register-push.dto';
import { UnregisterPushDto } from './dto/unregister-push.dto';

@Controller('mobile')
export class MobileController {
  constructor(private readonly mobile: MobileService) {}

  // — Public —

  @Get('menu')
  getMenu() {
    return this.mobile.getMenu();
  }

  @Get('product/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.mobile.getProductBySlug(slug);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: MobileLoginDto) {
    return this.mobile.login(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/register')
  register(@Body() dto: MobileRegisterDto) {
    return this.mobile.register(dto.email, dto.password, dto.name, dto.phone);
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: MobileRefreshDto) {
    return this.mobile.refresh(dto.refreshToken);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/send-code')
  @HttpCode(HttpStatus.OK)
  sendCode(@Body() dto: SendCodeDto) {
    return this.mobile.sendCode(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/complete')
  @HttpCode(HttpStatus.OK)
  completeAuth(@Body() dto: CompleteAuthDto) {
    return this.mobile.completeAuth(dto.phone, dto.code, dto.name);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/result')
  @HttpCode(HttpStatus.OK)
  checkAuthResult(@Body() dto: CheckAuthResultDto) {
    return this.mobile.checkAuthResult(dto.phone, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/social/vk')
  @HttpCode(HttpStatus.OK)
  socialVk(@Body() dto: SocialVkDto) {
    return this.mobile.socialVk(dto.access_token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/social/yandex')
  @HttpCode(HttpStatus.OK)
  socialYandex(@Body() dto: SocialYandexDto) {
    return this.mobile.socialYandex(dto.access_token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/social/telegram')
  @HttpCode(HttpStatus.OK)
  socialTelegram(@Body() dto: SocialTelegramDto) {
    return this.mobile.socialTelegram(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/social/email-otp')
  @HttpCode(HttpStatus.OK)
  socialEmailOtp(@Body() dto: SocialEmailOtpDto) {
    return this.mobile.socialEmailOtp(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/send-email-otp')
  @HttpCode(HttpStatus.OK)
  sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.mobile.sendEmailOtp(dto.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/verify-email-otp')
  @HttpCode(HttpStatus.OK)
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.mobile.verifyEmailOtp(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/send-phone-otp')
  @HttpCode(HttpStatus.OK)
  sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
    return this.mobile.sendPhoneOtp(dto.phone, dto.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/verify-phone-otp')
  @HttpCode(HttpStatus.OK)
  verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    return this.mobile.verifyPhoneOtp(dto.phone, dto.code);
  }

  // — Protected (JWT required) —

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.mobile.getProfile(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.mobile.updateProfile(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('addresses')
  getAddresses(@Req() req: any) {
    return this.mobile.getAddresses(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('addresses')
  createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.mobile.createAddress(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('addresses/:id')
  deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.mobile.deleteAddress(req.user.sub, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('orders')
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.mobile.createOrder(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders')
  getOrders(@Req() req: any) {
    return this.mobile.getMyOrders(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders/:id')
  getOrder(@Req() req: any, @Param('id') id: string) {
    return this.mobile.getMyOrderById(req.user.sub, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders/:id/courier')
  getOrderCourier(@Req() req: any, @Param('id') id: string) {
    return this.mobile.getMyOrderCourierInfo(req.user.sub, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('push/register')
  registerPush(@Req() req: any, @Body() dto: RegisterPushDto) {
    return this.mobile.registerPushToken(req.user.sub, dto.token, dto.platform);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('push/unregister')
  unregisterPush(@Req() req: any, @Body() dto: UnregisterPushDto) {
    return this.mobile.unregisterPushToken(req.user.sub, dto.token);
  }
}
