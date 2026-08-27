import {
  IsArray, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @IsNotEmpty()
  @IsString()
  medicineId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number; // unit price
}

export class AdminCreateQuotationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
