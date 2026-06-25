import { IsEmail, IsString } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;
}
