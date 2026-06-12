import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryMode, PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsEnum(DeliveryMode)
  deliveryMode!: DeliveryMode;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsString()
  @MinLength(10)
  customerPhone!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  desiredTime?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
