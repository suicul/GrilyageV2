import { Module, Global } from '@nestjs/common';
import { OtpThrottleService } from './otp-throttle.service';

@Global()
@Module({
  providers: [OtpThrottleService],
  exports: [OtpThrottleService],
})
export class OtpThrottleModule {}
