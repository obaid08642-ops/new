import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  iban?: string;
}
