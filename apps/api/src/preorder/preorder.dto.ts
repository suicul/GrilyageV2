import { IsString, IsEmail, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class CreatePreorderDto {
  @IsString() customerName!: string;
  @IsString() customerPhone!: string;
  @IsEmail() @IsOptional() customerEmail?: string;
  @IsDateString() desiredDate!: string;
  @IsInt() @Min(1) @IsOptional() guestCount?: number;
  @IsString() @IsOptional() comment?: string;
}
