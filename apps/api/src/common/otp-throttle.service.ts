import { Injectable, Logger } from '@nestjs/common';

interface IpRecord {
  count: number;
  resetAt: number;
}

interface IdentifierRecord {
  attempts: number;
  lockedUntil: number | null;
}

@Injectable()
export class OtpThrottleService {
  private readonly logger = new Logger(OtpThrottleService.name);

  /** IP → { count, resetAt } — для rate-limit отправки/проверки OTP */
  private readonly ipMap = new Map<string, IpRecord>();

  /** identifier (phone/email) → { attempts, lockedUntil } */
  private readonly idMap = new Map<string, IdentifierRecord>();

  private readonly ipLimitSend = 5;       // макс send-запросов с IP в минуту
  private readonly ipLimitVerify = 10;    // макс verify-запросов с IP в минуту
  private readonly ipWindowMs = 60_000;   // окно — 1 минута
  private readonly maxAttempts = 10;       // макс неудачных попыток для номера
  private readonly lockDurationMs = 3_600_000; // блокировка на 1 час
  private readonly cleanupIntervalMs = 300_000; // очистка каждые 5 минут

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  // — IP rate-limit —

  /** Проверить IP-лимит для отправки OTP. Выбрасывает ошибку при превышении. */
  checkSendIp(ip: string): void {
    this.checkIp(ip, this.ipLimitSend, 'send');
  }

  /** Проверить IP-лимит для проверки OTP. Выбрасывает ошибку при превышении. */
  checkVerifyIp(ip: string): void {
    this.checkIp(ip, this.ipLimitVerify, 'verify');
  }

  private checkIp(ip: string, limit: number, action: string): void {
    const now = Date.now();
    const record = this.ipMap.get(ip);

    if (!record || now > record.resetAt) {
      this.ipMap.set(ip, { count: 1, resetAt: now + this.ipWindowMs });
      return;
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      this.logger.warn(`IP rate-limit exceeded: ${ip} (${action})`);
      throw new OtpThrottleException(
        `Слишком много запросов. Повторите через ${retryAfter} сек.`,
      );
    }

    record.count++;
  }

  // — Identifier lockout —

  /** Зарегистрировать неудачную попытку для identifier. Блокирует при достижении лимита. */
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    let record = this.idMap.get(identifier);

    if (!record || (record.lockedUntil && now > record.lockedUntil)) {
      record = { attempts: 1, lockedUntil: null };
    } else {
      record.attempts++;
    }

    if (record.attempts >= this.maxAttempts && !record.lockedUntil) {
      record.lockedUntil = now + this.lockDurationMs;
      this.logger.warn(`Identifier locked: ${identifier} for 1 hour`);
    }

    this.idMap.set(identifier, record);
  }

  /** Проверить, не заблокирован ли identifier. Выбрасывает ошибку при блокировке. */
  checkIdentifier(identifier: string): void {
    const now = Date.now();
    const record = this.idMap.get(identifier);

    if (record?.lockedUntil && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 60_000);
      throw new OtpThrottleException(
        `Слишком много неудачных попыток. Номер заблокирован на ${remaining} мин.`,
      );
    }
  }

  /** Сбросить счётчик после успешной верификации. */
  clearIdentifier(identifier: string): void {
    this.idMap.delete(identifier);
  }

  // — Cleanup —

  private cleanup(): void {
    const now = Date.now();

    for (const [ip, record] of this.ipMap) {
      if (now > record.resetAt) this.ipMap.delete(ip);
    }

    for (const [id, record] of this.idMap) {
      if (record.lockedUntil && now > record.lockedUntil) {
        this.idMap.delete(id);
      }
    }
  }

  /** Вызвать при shutdown модуля. */
  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export class OtpThrottleException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpThrottleException';
  }
}
