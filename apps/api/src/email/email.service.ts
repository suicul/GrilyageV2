import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM', 'Грильяж <noreply@grillyage.ru>');
    const smtpSecure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const smtpIgnoreTLS = this.config.get<string>('SMTP_IGNORE_TLS', 'true') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp'),
      port: this.config.get<number>('SMTP_PORT', 25),
      secure: smtpSecure,
      auth: smtpSecure ? {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASSWORD', ''),
      } : undefined,
      ignoreTLS: smtpIgnoreTLS,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL', 'https://grillyage.ru');
    const verifyLink = `${webUrl}/verify-email?token=${token}`;

    await this.sendMail({
      to,
      subject: 'Подтвердите email — Грильяж',
      html: this.buildTemplate({
        title: 'Подтверждение email',
        body: `
          <p>Здравствуйте!</p>
          <p>Спасибо за регистрацию в <strong>Грильяж</strong>. Для завершения регистрации подтвердите ваш email:</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${verifyLink}" class="button">Подтвердить email</a>
          </div>
          <p style="color:#7B6147;font-size:13px">Если кнопка не работает, скопируйте ссылку:<br>
          <span style="color:#D6B06A">${verifyLink}</span></p>
          <p style="color:#7B6147;font-size:13px">Ссылка действительна 24 часа.</p>
        `,
      }),
    });
  }

  async sendEmailOtp(to: string, code: string): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Код подтверждения — Грильяж',
      html: this.buildTemplate({
        title: 'Код подтверждения',
        body: `
          <p>Здравствуйте!</p>
          <p>Ваш код для подтверждения email:</p>
          <div class="code">${code}</div>
          <p style="color:#7B6147;font-size:13px">Код действителен 10 минут. Никому не сообщайте этот код.</p>
          <p style="color:#7B6147;font-size:13px">Если вы не запрашивали код — просто проигнорируйте это письмо.</p>
        `,
      }),
    });
  }

  async sendPhoneOtp(to: string, code: string): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Код для входа — Грильяж',
      html: this.buildTemplate({
        title: 'Вход в аккаунт',
        body: `
          <p>Здравствуйте!</p>
          <p>Ваш код для входа в <strong>Грильяж</strong>:</p>
          <div class="code">${code}</div>
          <p style="color:#7B6147;font-size:13px">Код действителен 10 минут. Никому не сообщайте этот код.</p>
          <p style="color:#7B6147;font-size:13px">Если вы не запрашивали код — просто проигнорируйте это письмо.</p>
        `,
      }),
    });
  }

  async sendOrderConfirmation(to: string, orderNumber: number): Promise<void> {
    await this.sendMail({
      to,
      subject: `Заказ №${orderNumber} принят — Грильяж`,
      html: this.buildTemplate({
        title: 'Заказ принят!',
        body: `
          <p>Здравствуйте!</p>
          <p>Ваш заказ <strong>№${orderNumber}</strong> успешно оформлен.</p>
          <p>Мы свяжемся с вами в ближайшее время для подтверждения.</p>
          <p>С уважением,<br>команда <strong>Грильяж</strong></p>
        `,
      }),
    });
  }

  private buildTemplate(opts: { title: string; body: string }): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F6F1E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table width="480" cellpadding="0" cellspacing="0" style="max-width:100%;background:#FFFBF5;border-radius:24px;border:1px solid #EADFCF;overflow:hidden">
    <tr><td style="padding:32px 32px 0">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><img src="https://grillyage.ru/logo.png" alt="Грильяж" width="36" height="36" style="border-radius:10px"></td>
        <td style="text-align:right;font-size:18px;font-weight:700;color:#2F261F">Грильяж</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 32px 0">
      <div style="height:2px;background:linear-gradient(90deg,#D6B06A,transparent);border-radius:2px"></div>
    </td></tr>
    <tr><td style="padding:32px">
      <h1 style="font-size:22px;color:#2F261F;margin:0 0 16px">${opts.title}</h1>
      <div style="font-size:15px;color:#2F261F;line-height:1.6">${opts.body}</div>
    </td></tr>
    <tr><td style="padding:0 32px 32px;text-align:center">
      <p style="font-size:12px;color:#A8927A;margin:0">© ${new Date().getFullYear()} Грильяж Gastro-House</p>
      <p style="font-size:12px;color:#A8927A;margin:4px 0 0">Омск, Харьковская, 7</p>
    </td></tr>
  </table>
</td></tr></table>
</body>
</html>`;
  }

  private async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}:`, err);
      throw err;
    }
  }
}
