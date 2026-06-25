import { IsString, MinLength } from 'class-validator';

export class SocialYandexCodeDto {
  @IsString()
  code!: string;

  @IsString()
  @MinLength(5)
  redirect_uri!: string;
}
