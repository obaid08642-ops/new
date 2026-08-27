import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PharmacyOfferLineDto {
  @IsString()
  order_item_id!: string;

  @IsOptional()
  @IsString()
  inventory_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  offered_qty?: number;

  @IsOptional()
  @IsObject()
  alternative?: Record<string, unknown>;
}

export class SubmitPharmacyOfferDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PharmacyOfferLineDto)
  items!: PharmacyOfferLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  delivery_fee?: number;

  @IsOptional()
  @IsIn(['pharmacy_delivery', 'pickup'])
  fulfillment?: 'pharmacy_delivery' | 'pickup';

  @IsOptional()
  @IsBoolean()
  cod_allowed?: boolean;

  @IsOptional()
  @IsBoolean()
  insurance_ready?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  preparation_minutes?: number;
}

export class SelectPharmacyOfferDto {
  @IsIn(['cash', 'insurance'])
  coverage_mode!: 'cash' | 'insurance';
}

export class AcceptPharmacyFinalQuoteDto {
  @IsString()
  quote_hash!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quote_revision!: number;
}
