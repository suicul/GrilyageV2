import { IsString } from 'class-validator';

export class StaffLoginDto {
  @IsString()
  login!: string;

  @IsString()
  password!: string;
}

export class StaffRefreshDto {
  @IsString()
  refreshToken!: string;
}
