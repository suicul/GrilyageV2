import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.setup';
import { validateEnvironment } from './env-validation';
import { StructuredLogger } from './logger/logger.service';
import * as Sentry from '@sentry/node';
import * as express from 'express';
import * as path from 'path';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // 1. Validate environment before anything else
  try {
    validateEnvironment(process.env);
    logger.log('Environment validation passed');
  } catch (err) {
    logger.fatal(`Environment validation failed: ${(err as Error).message}`);
    process.exit(1);
    return;
  }

  // 2. Initialize Sentry
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'production',
      tracesSampleRate: 0.1,
    });
    logger.log('Sentry initialized');
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: process.env.NODE_ENV === 'production',
  });

  if (process.env.NODE_ENV === 'production') {
    app.useLogger(new StructuredLogger());
  }

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Parse cookies (needed for httpOnly JWT cookie extraction)
  app.use(cookieParser());

  // Serve uploaded files statically
  const uploadsDir = process.env.UPLOADS_DIR ?? path.resolve(__dirname, '..', '..', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // CSP: strict but works with Yandex Maps, VK ID SDK, Sentry, Google Fonts
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // API serves JSON, not HTML pages — no inline scripts needed.
            // Web-side nonce-based CSP is handled by Next.js middleware.
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: [
            "'self'",
            'https://fonts.gstatic.com',
            'data:',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://images.unsplash.com',
            'https://*.unsplash.com',
          ],
          frameSrc: [
            "'self'",
            'https://yandex.com',
            'https://yandex.ru',
          ],
          connectSrc: [
            "'self'",
            'https://o4511609450004480.ingest.de.sentry.io',
            'wss://grillyage.ru',
          ],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  // CSRF protection: Content-Type + Origin/Referer check
  app.use((req: any, res: any, next: () => void) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const ct: string = (req.headers['content-type'] ?? '').toLowerCase();
      if (
        !ct.startsWith('application/json')
        && !ct.startsWith('multipart/form-data')
        && !ct.startsWith('application/x-www-form-urlencoded')
      ) {
        res.status(415).json({ message: 'Unsupported Media Type — expected application/json' });
        return;
      }

      // Origin / Referer check for cookie-authenticated requests
      const hasCookieToken = req.cookies?.staffAccessToken || req.cookies?.accessToken;
      if (hasCookieToken) {
        const origin: string | undefined = req.headers['origin'];
        const referer: string | undefined = req.headers['referer'];
        const sourceOrigin = origin ?? (referer ? extractOrigin(referer) : null);

        if (sourceOrigin) {
          const configuredOrigins = (config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000')
            .split(',')
            .map((o: string) => o.trim())
            .filter(Boolean);

          const isValid = configuredOrigins.some((allowed: string) => sourceOrigin === allowed);
          if (!isValid) {
            res.status(403).json({ message: 'CSRF check failed: origin not allowed' });
            return;
          }
        }
      }
    }
    next();
  });

  function extractOrigin(url: string): string | null {
    try { return new URL(url).origin; } catch { return null; }
  }

  // Request logging in production
  if (process.env.NODE_ENV === 'production') {
    const httpLogger = new Logger('HTTP');
    app.use((req: any, res: any, next: () => void) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        if (req.url?.startsWith('/api/v1')) {
          httpLogger.log(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
        }
      });
      next();
    });
  }

  const configuredOrigins = (config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (
        !origin
        || configuredOrigins.includes(origin)
        || /^http:\/\/100\.\d+\.\d+\.\d+:3000$/.test(origin)
        || /^https:\/\/[^/]+\.ts\.net$/.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  setupSwagger(app);

  const port = Number(config.get<string>('API_PORT') ?? 4000);
  await app.listen(port);

  // Graceful shutdown — close WebSocket connections, DB pool
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
