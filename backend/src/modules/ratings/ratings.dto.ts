import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

/** Sub-ratings of a doctor's appointment (owner decision 2026-10-24): the doctor, the clinic, the waiting time; each 1..5. */
export class SubRatingsDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) doctor?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) clinic?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) waiting?: number;
}

export class SubmitDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsDefined()
  @IsString()
  entity_type: string;

  @IsDefined()
  @IsString()
  entity_id: string;

  @IsDefined()
  @IsString()
  provider_id: string;

  @IsDefined()
  @IsNumber()
  score: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubRatingsDto)
  sub_ratings?: SubRatingsDto;
}

export class RejectReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
