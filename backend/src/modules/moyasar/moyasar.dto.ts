import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class WebhookDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

}

export class RefundDto {
  @IsOptional()
  @IsNumber()
  amount?: number;
}
