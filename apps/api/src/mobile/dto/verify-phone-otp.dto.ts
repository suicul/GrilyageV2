import { IsString, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Неверный формат телефона' })
  phone!: string;

  @IsString()
  code!: string;
}
