import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SubscribeAlertDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsIn(['restock', 'price_drop'])
  kind: 'restock' | 'price_drop';

  /** Required for price_drop: notify when the price falls to this (SAR) or below. */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price_threshold?: number;
}

export class ReportPriceDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  new_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  old_price?: number;
}

export class ReportRestockDto {
  /** Inventory sku that came back in stock. */
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  generic_name?: string;

  @IsOptional()
  @IsString()
  medicine_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;
}
