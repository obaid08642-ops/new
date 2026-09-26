import { IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutSessionItemDto {
  @IsDefined()
  @IsIn(['medicine', 'consultation'])
  type: 'medicine' | 'consultation';

  @IsDefined()
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  slot?: string;
}

export class CreateCheckoutSessionDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutSessionItemDto)
  items: CheckoutSessionItemDto[];

  @IsOptional()
  @IsString()
  patient_phone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  source_agent?: string;
}
