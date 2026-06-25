import { IsString, MinLength } from 'class-validator';

export class SocialYandexDto {
  @IsString()
  @MinLength(10)
  access_token!: string;
}
