import { IsString } from 'class-validator';

export class RegisterPushDto {
  @IsString()
  token!: string;

  @IsString()
  platform!: string;
}
