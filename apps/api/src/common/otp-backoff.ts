import { BadRequestException } from '@nestjs/common';

/**
 * Validates exponential backoff for OTP attempts.
 *
 * The delay doubles with each failed attempt:
 *   delay = 2^attempts seconds
 *
 * So after the 1st failure the user waits 2s,
 * after the 2nd — 4s, after the 3rd — 8s, after the 4th — 16s.
 * At 5+ attempts the code is permanently burned by the caller.
 *
 * @throws BadRequestException when the backoff delay hasn't elapsed yet
 */
export function validateOtpBackoff(otp: { attempts: number; updatedAt: Date }): void {
  if (otp.attempts <= 0) return;

  const delayMs = Math.pow(2, otp.attempts) * 1000;
  const elapsed = Date.now() - otp.updatedAt.getTime();

  if (elapsed < delayMs) {
    const remaining = Math.ceil((delayMs - elapsed) / 1000);
    throw new BadRequestException(
      `Слишком много попыток. Повторите через ${remaining} сек.`,
    );
  }
}
