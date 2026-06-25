import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CsrfService {
  /**
   * Generate a cryptographically random CSRF token.
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Constant-time comparison of cookie and header tokens
   * to prevent timing attacks.
   */
  validateToken(cookieToken: string, headerToken: string): boolean {
    if (!cookieToken || !headerToken) return false;
    if (cookieToken.length !== headerToken.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken),
    );
  }
}
