import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const credentialsPath = this.config.get<string>('FCM_CREDENTIALS_PATH');
    if (!credentialsPath) {
      this.logger.warn(
        'FCM_CREDENTIALS_PATH not set — push notifications disabled',
      );
      return;
    }

    try {
      initializeApp({
        credential: applicationDefault(),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin initialized (ADC)');
    } catch {
      try {
        initializeApp({
          credential: cert(credentialsPath),
        });
        this.initialized = true;
        this.logger.log('Firebase Admin initialized from cert file');
      } catch (e) {
        this.logger.error('Failed to initialize Firebase Admin', e);
      }
    }
  }

  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!this.initialized) return;

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, active: true },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const message: MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'orders',
          priority: 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const messaging = getMessaging();
      const response = await messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            resp.error?.code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]!.token);
          }
        });

        if (invalidTokens.length > 0) {
          await this.prisma.pushToken.updateMany({
            where: { token: { in: invalidTokens } },
            data: { active: false },
          });
          this.logger.warn(
            `Deactivated ${invalidTokens.length} invalid push tokens`,
          );
        }
      }

      this.logger.log(
        `Push sent to user ${userId}: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );
    } catch (e) {
      this.logger.error(`Failed to send push to user ${userId}`, e);
    }
  }

  async sendToAllStaff(
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!this.initialized) return;

    const staff = await this.prisma.staffUser.findMany({
      select: { id: true },
    });

    await Promise.allSettled(
      staff.map((s) => this.sendToUser(s.id, payload)),
    );
  }
}
