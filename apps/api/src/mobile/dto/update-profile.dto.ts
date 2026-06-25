import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Неверный формат телефона' })
  phone?: string;
}
