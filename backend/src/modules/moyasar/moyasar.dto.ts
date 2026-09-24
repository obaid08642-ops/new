import { IsNumber, IsOptional } from 'class-validator';

export class WebhookDto {
  @IsOptional()
  id?: any;

  @IsOptional()
  data?: any;

}

export class RefundDto {
  @IsOptional()
  @IsNumber()
  amount?: number;
}
