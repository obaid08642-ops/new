import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDefined,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RefillItemDto {
  @IsDefined()
  @IsString()
  medicine_id: string;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;
}

export class SubscribeRefillDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefillItemDto)
  items: RefillItemDto[];

  /** Days between automatic refills (chronic cadence). */
  @IsDefined()
  @IsInt()
  @Min(7)
  @Max(120)
  cadence_days: number;

  /** Required when any item requires a prescription. */
  @IsOptional()
  @IsString()
  prescription_id?: string;

  /** Explicit Rx expiry override; otherwise derived from the prescription document. */
  @IsOptional()
  @IsDateString()
  prescription_valid_until?: string;

  /** Days before each refill to send the reminder. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(14)
  reminder_days_before?: number;

  /** Seedable first refill date (used by journeys/tests); defaults to now + cadence. */
  @IsOptional()
  @IsDateString()
  first_refill_at?: string;

  @IsOptional()
  @IsObject()
  delivery_address?: Record<string, unknown>;
}
