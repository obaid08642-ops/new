import {
  IsArray, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProcurementItemDto {
  @IsNotEmpty()
  @IsString()
  medicineId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateProcurementRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcurementItemDto)
  items: ProcurementItemDto[];

  @IsOptional()
  @IsString()
  comment?: string;
}
