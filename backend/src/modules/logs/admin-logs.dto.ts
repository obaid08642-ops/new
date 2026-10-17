import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Only warn and error are stored in `app_logs` (info and debug stay on stdout). */
export const SEARCHABLE_LEVELS = ['warn', 'error'] as const;

export class ListLogsQueryDto {
  @IsOptional()
  @IsIn(SEARCHABLE_LEVELS)
  level?: (typeof SEARCHABLE_LEVELS)[number];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  request_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number;
}
