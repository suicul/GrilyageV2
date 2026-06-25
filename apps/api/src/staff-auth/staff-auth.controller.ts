import {
  Controller, Post, Get, Body, UseGuards, Req, Res,
  HttpCode, HttpStatus, Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { StaffAuthService } from './staff-auth.service';
import { StaffTwoFactorService } from './staff-two-factor.service';
import {
  StaffLoginDto, StaffRefreshDto,
  TwoFactorSetupDto, TwoFactorEnableDto, TwoFactorDisableDto, TwoFactorCompleteLoginDto,
} from './dto/staff-auth.dto';
import { StaffJwtGuard } from './staff-jwt.guard';
import { CsrfService } from '../common/csrf.service';
import { Request, Response } from 'express';

const ACCESS_TOKEN_COOKIE = 'staffAccessToken';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(
    private readonly staffAuthService: StaffAuthService,
    private readonly twoFactorService: StaffTwoFactorService,
    @Inject(ConfigService) private readonly config: ConfigService,
    private readonly csrfService: CsrfService,
  ) {}

  private setAccessTokenCookie(res: Response, token: string): void {
    const maxAgeSec = parseInt(
      this.config.get<string>('STAFF_JWT_ACCESS_TTL', '15m'),
      10,
    );
    const maxAgeMs = /^\d+$/.test(String(maxAgeSec))
      ? Number(maxAgeSec) * 1000
      : 15 * 60 * 1000;

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    });
  }

  private clearAccessTokenCookie(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @SkipThrottle()
  @Get('csrf-token')
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const token = this.csrfService.generateToken();
    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return { token };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: StaffLoginDto, @Res({ passthrough: true }) res: Response) {
    const result: Record<string, unknown> = await this.staffAuthService.login(dto);

    // If 2FA is required, don't set the cookie — just forward the challenge token
    if (result.requires2fa) {
      return { requires2fa: true as const, challengeToken: result.challengeToken };
    }

    this.setAccessTokenCookie(res, result.accessToken as string);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: StaffRefreshDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.staffAuthService.refresh(dto.refreshToken);
    this.setAccessTokenCookie(res, tokens.accessToken);
    return tokens;
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: StaffRefreshDto, @Res({ passthrough: true }) res: Response) {
    await this.staffAuthService.logout(dto.refreshToken);
    this.clearAccessTokenCookie(res);
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(StaffJwtGuard)
  async getProfile(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.staffAuthService.getProfile(user.sub);
  }

  // ——— 2FA endpoints ———

  @SkipThrottle()
  @Post('2fa/setup')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async setup2fa(@Req() req: Request) {
    const user = req.user as { sub: string; login: string };
    return this.twoFactorService.setup(user.sub, user.login);
  }

  @SkipThrottle()
  @Post('2fa/enable')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async enable2fa(@Req() req: Request, @Body() dto: TwoFactorEnableDto) {
    const user = req.user as { sub: string };
    return this.twoFactorService.enable(user.sub, dto.secret, dto.code);
  }

  @SkipThrottle()
  @Post('2fa/disable')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async disable2fa(@Req() req: Request, @Body() dto: TwoFactorDisableDto) {
    const user = req.user as { sub: string };
    // Verify TOTP code before disabling
    const verified = await this.twoFactorService.verifyCode(user.sub, dto.code);
    if (!verified) {
      return { error: 'Неверный код подтверждения' };
    }
    return this.twoFactorService.disable(user.sub);
  }

  @SkipThrottle()
  @Get('2fa/status')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorStatus(@Req() req: Request) {
    const user = req.user as { sub: string };
    const enabled = await this.twoFactorService.isEnabled(user.sub);
    return { enabled };
  }

  @Post('2fa/complete-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async completeLogin(
    @Body() dto: TwoFactorCompleteLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.staffAuthService.completeLogin(dto.challengeToken, dto.code);
    this.setAccessTokenCookie(res, tokens.accessToken);
    return tokens;
  }
}
