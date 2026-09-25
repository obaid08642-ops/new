import { IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddCardDto {
  @IsOptional()
  @IsString()
  last4?: string;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  holderName: string;

  @IsOptional()
  @IsString()
  expiry: string;

  @IsOptional()
  @IsIn(['visa', 'mastercard', 'mada', 'amex'])
  type?: string;

}

export class TopupDto {
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
export class ConfirmTopupDto {
  @IsDefined()
  @IsString()
  topup_id: string;
}
export class TransferDto {
  @IsDefined()
  @IsString()
  recipient: string;

  @IsDefined()
  @IsNumber()
  amount: number;
}
