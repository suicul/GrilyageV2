import { IsEmail } from 'class-validator';

export class SocialSendEmailOtpDto {
  @IsEmail()
  email!: string;
}
