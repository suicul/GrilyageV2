import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASSWORD', ''),
      },
      ignoreTLS: !this.config.get<boolean>('SMTP_SECURE', false),
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL', 'http://localhost:3000');
    const verifyLink = `${webUrl}/verify-email?token=${token}`;

    await this.sendMail({
      to,
      subject: 'Подтверждение email — Грильяж',
      html: `
        <h1>Подтверждение email</h1>
        <p>Для подтверждения email перейдите по ссылке:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <p>Ссылка действительна 24 часа.</p>
        <p>— Грильяж Gastro-House</p>
      `,
    });
  }

  async sendOrderConfirmation(to: string, orderNumber: number): Promise<void> {
    await this.sendMail({
      to,
      subject: `Заказ №${orderNumber} принят — Грильяж`,
      html: `
        <h1>Заказ принят!</h1>
        <p>Ваш заказ №${orderNumber} успешно оформлен.</p>
        <p>Мы свяжемся с вами для подтверждения.</p>
        <p>— Грильяж Gastro-House</p>
      `,
    });
  }

  private async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM', 'Грильяж <noreply@grilyazh-omsk.ru>');

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}:`, err);
    }
  }
}
