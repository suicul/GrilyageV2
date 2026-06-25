import { IsString, IsArray, IsOptional, MinLength, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId!: string;

  // TODO: add @IsInt() @Min(1) once class-transformer is available
  qty!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString()
  deliveryMode!: string;

  @IsString()
  paymentMethod!: string;

  @IsString()
  customerName!: string;

  @IsString()
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
