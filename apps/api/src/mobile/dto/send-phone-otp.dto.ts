import { IsString, Matches, IsEmail, IsOptional } from 'class-validator';

export class SendPhoneOtpDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Неверный формат телефона' })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
