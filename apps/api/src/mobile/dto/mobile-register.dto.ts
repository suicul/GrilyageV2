import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class MobileRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
