import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string | null;
  private readonly apiUrl = 'https://sms.ru/sms/send';

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('SMS_RU_API_KEY', '');
    this.apiKey = key && key.length > 0 ? key : null;
  }

  async sendSms(phone: string, text: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[SMS STUB] To ${phone}: ${text}`);
      return;
    }

    try {
      const body = new URLSearchParams({
        api_id: this.apiKey,
        to: phone.replace(/[^0-9+]/g, ''),
        msg: text,
        json: '1',
      });

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        this.logger.error(`SMS.ru API error: ${res.status}`);
        return;
      }

      const data = await res.json() as any;
      if (data.status !== 'OK') {
        this.logger.error(`SMS.ru send failed: ${JSON.stringify(data)}`);
        return;
      }

      this.logger.log(`SMS sent to ${phone}`);
    } catch (err) {
      this.logger.error(`SMS.ru request failed for ${phone}:`, err);
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const text = `Грильяж: ваш код подтверждения ${code}. Действителен 10 минут. Никому не сообщайте этот код.`;
    await this.sendSms(phone, text);
  }
}
