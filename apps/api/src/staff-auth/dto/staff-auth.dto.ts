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

export class TwoFactorSetupDto {}

export class TwoFactorEnableDto {
  @IsString()
  secret!: string;

  @IsString()
  code!: string;
}

export class TwoFactorDisableDto {
  @IsString()
  code!: string;
}

export class TwoFactorCompleteLoginDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  code!: string;
}
