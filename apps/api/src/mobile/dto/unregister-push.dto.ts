import { IsString } from 'class-validator';

export class UnregisterPushDto {
  @IsString()
  token!: string;
}
