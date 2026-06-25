import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CsrfService } from './csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly csrfService: CsrfService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // GET / HEAD / OPTIONS are read-only — no CSRF risk
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // ── 1. Origin / Referer check ──────────────────────────────
    const origin = request.headers.origin as string | undefined;
    const referer = request.headers.referer as string | undefined;
    const configuredOrigins = (
      this.config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000'
    )
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const sourceOrigin = origin ?? (referer ? extractOrigin(referer) : null);

    if (sourceOrigin) {
      const isValidOrigin = configuredOrigins.some(
        (allowed) => sourceOrigin === allowed,
      );
      if (!isValidOrigin) {
        throw new ForbiddenException('CSRF violation: origin not allowed');
      }
    }
    // If no Origin/Referer, this is a non-browser client (mobile, CLI) — skip.

    // ── 2. CSRF double-submit cookie check ─────────────────────
    const csrfCookie = request.cookies?.['csrf-token'] as string | undefined;
    if (csrfCookie) {
      const csrfHeader = request.headers['x-csrf-token'] as string | undefined;
      if (
        !csrfHeader ||
        !this.csrfService.validateToken(csrfCookie, csrfHeader)
      ) {
        throw new ForbiddenException(
          'CSRF violation: invalid or missing X-CSRF-Token header',
        );
      }
    }

    return true;
  }
}

function extractOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
