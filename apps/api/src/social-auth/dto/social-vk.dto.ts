import { IsString, MinLength } from 'class-validator';

export class SocialVkDto {
  @IsString()
  @MinLength(10)
  access_token!: string;
}
