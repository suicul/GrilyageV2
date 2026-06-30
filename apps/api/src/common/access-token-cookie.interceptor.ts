import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import type { Response } from 'express';

/**
 * Interceptor that automatically sets an httpOnly cookie with the access token
 * whenever the response body contains an `accessToken` field.
 *
 * This ensures all auth endpoints (login, refresh, social login, phone OTP, etc.)
 * set the cookie without having to modify each controller individually.
 */
@Injectable()
export class AccessTokenCookieInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((body) => {
        if (body && typeof body === 'object' && body.accessToken) {
          const res = context.switchToHttp().getResponse<Response>();

          const raw = this.config.get<string>('JWT_ACCESS_TTL', '15m');
          const maxAgeMs = this.parseTtl(raw) * 1000;

          res.cookie('accessToken', body.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: maxAgeMs,
          });
        }
        return body;
      }),
    );
  }

  /** Parse a TTL string like "15m", "1h", "30d" → seconds */
  private parseTtl(raw: string): number {
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60; // default 15min in seconds
    const val = parseInt(match[1]!, 10);
    switch (match[2]) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 15 * 60;
    }
  }
}
