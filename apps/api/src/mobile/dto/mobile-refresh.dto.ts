import { IsString, MinLength } from 'class-validator';

export class MobileRefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
