import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @MinLength(2)
  street!: string;

  @IsString()
  @MinLength(1)
  house!: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
