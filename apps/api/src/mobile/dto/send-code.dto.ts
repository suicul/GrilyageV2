import { IsString, Matches } from 'class-validator';

export class SendCodeDto {
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Неверный формат телефона' })
  phone!: string;
}
