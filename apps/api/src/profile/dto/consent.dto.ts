import { IsBoolean, IsOptional } from 'class-validator';

export class SaveConsentDto {
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}
