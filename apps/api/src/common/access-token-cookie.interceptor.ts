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

          const maxAgeSec = parseInt(
            this.config.get<string>('JWT_ACCESS_TTL', '15m'),
            10,
          );
          const maxAgeMs = /^\d+$/.test(String(maxAgeSec))
            ? Number(maxAgeSec) * 1000
            : 15 * 60 * 1000;

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
}
