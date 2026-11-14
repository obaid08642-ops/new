import { IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** The reason is required on every admin decision (who, when and why stay on the row and in the audit trail). */
export class PriceReviewNoteDto {
  @IsDefined() @IsString() @MinLength(3) @MaxLength(500) note!: string;
}

export class PriceReviewSuspendDto {
  @IsDefined() @IsString() @MinLength(3) @MaxLength(500) note!: string;
  /** When the temporary suspension is meant to end (shown on the review; the admin lifts it with the provider "reactivate"). */
  @IsDefined() @IsDateString() until!: string;
}

export class PriceReviewPenaltyDto {
  @IsDefined() @IsString() @MinLength(3) @MaxLength(500) note!: string;
  @IsDefined() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100_000) amount_sar!: number;
}

export class PriceReviewListQuery {
  @IsOptional() @IsIn(['open', 'catalogue_updated', 'pharmacy_actioned', 'dismissed', 'all']) status?: string;
  @IsOptional() @IsString() @MaxLength(80) pharmacy_id?: string;
  @IsOptional() @IsString() min_percent?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
