import { IsString, Matches, IsOptional } from 'class-validator';

export class SocialPhoneOtpLoginDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Неверный формат телефона' })
  phone!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
