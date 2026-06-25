import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

/**
 * Structured JSON logger for production.
 * Replaces NestJS's default console logger with parseable JSON output.
 * In development, falls through to human-readable NestJS format.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger extends ConsoleLogger {
  protected override formatMessage(
    logLevel: 'verbose' | 'debug' | 'log' | 'warn' | 'error' | 'fatal',
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      return super.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff,
      );
    }

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      pid: process.pid,
      context: this.context,
      message,
    };

    return JSON.stringify(entry);
  }
}
