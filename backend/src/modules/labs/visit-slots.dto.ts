import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVisitSlotDto {
  @IsString()
  @IsOptional()
  provider_account_id?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsDateString()
  window_start: string;

  @IsDateString()
  window_end: string;

  @IsInt()
  @Min(1)
  @Max(50)
  capacity: number;

  @IsString()
  @IsOptional()
  idempotency_key?: string;
}

export class ListVisitSlotsDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  provider_account_id?: string;
}

export class BookVisitSlotDto {
  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}

export class SlotDateQueryDto {
  @IsString()
  @IsOptional()
  city?: string;
}

export class BookLabSlotDto {
  @IsString()
  @IsOptional()
  visit_slot_id?: string;

  @IsString()
  @IsOptional()
  visit_slot_hold_id?: string;
}

export const SLOT_STATUSES = ['OPEN', 'FULL', 'CLOSED'] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const HOLD_STATUSES = ['HELD', 'CONSUMED', 'RELEASED', 'EXPIRED'] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export function normalizeCity(city: unknown): string {
  return String(city ?? '').trim().toLowerCase();
}

export function isValidSlotDate(date: unknown): boolean {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(date + 'T00:00:00Z').getTime());
}
