import { IsEmail, IsString } from 'class-validator';

export class SocialEmailOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;
}
