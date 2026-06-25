import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { SocialAuthService } from './social-auth.service';
import { SocialVkDto } from './dto/social-vk.dto';
import { SocialYandexDto } from './dto/social-yandex.dto';
import { SocialYandexCodeDto } from './dto/social-yandex-code.dto';
import { SocialTelegramDto } from './dto/social-telegram.dto';
import { SocialEmailOtpDto } from './dto/social-email-otp.dto';
import { SocialSendEmailOtpDto } from './dto/social-send-email-otp.dto';
import { SocialSendPhoneOtpDto } from './dto/social-send-phone-otp.dto';
import { SocialPhoneOtpLoginDto } from './dto/social-phone-otp-login.dto';

@Controller('auth/social')
export class SocialAuthController {
  constructor(private readonly social: SocialAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('vk')
  @HttpCode(HttpStatus.OK)
  vkLogin(@Body() dto: SocialVkDto) {
    return this.social.vkLogin(dto.access_token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('yandex')
  @HttpCode(HttpStatus.OK)
  yandexLogin(@Body() dto: SocialYandexDto) {
    return this.social.yandexLogin(dto.access_token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('yandex/code')
  @HttpCode(HttpStatus.OK)
  yandexCodeLogin(@Body() dto: SocialYandexCodeDto) {
    return this.social.yandexCodeLogin(dto.code, dto.redirect_uri);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  telegramLogin(@Body() dto: SocialTelegramDto) {
    return this.social.telegramLogin(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('email-otp')
  @HttpCode(HttpStatus.OK)
  emailOtpLogin(@Body() dto: SocialEmailOtpDto) {
    return this.social.emailOtpLogin(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-email-otp')
  @HttpCode(HttpStatus.OK)
  sendEmailOtp(@Body() dto: SocialSendEmailOtpDto) {
    return this.social.sendEmailOtp(dto.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-phone-otp')
  @HttpCode(HttpStatus.OK)
  sendPhoneOtp(@Body() dto: SocialSendPhoneOtpDto) {
    return this.social.sendPhoneOtp(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('phone-otp')
  @HttpCode(HttpStatus.OK)
  phoneOtpLogin(@Body() dto: SocialPhoneOtpLoginDto) {
    return this.social.phoneOtpLogin(dto.phone, dto.code, dto.name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('accounts')
  getLinkedAccounts(@Req() req: any) {
    return this.social.getLinkedAccounts(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('accounts/:provider/:providerId')
  unlinkAccount(
    @Req() req: any,
    @Param('provider') provider: string,
    @Param('providerId') providerId: string,
  ) {
    return this.social.unlinkAccount(req.user.sub, provider, providerId);
  }
}
