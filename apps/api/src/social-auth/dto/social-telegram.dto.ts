import { IsNumber, IsString, IsOptional, MinLength } from 'class-validator';

export class SocialTelegramDto {
  @IsNumber()
  id!: number;

  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsNumber()
  auth_date!: number;

  @IsString()
  @MinLength(10)
  hash!: string;
}
