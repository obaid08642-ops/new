import { IsBoolean, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * What a lab, radiology centre or nursing provider chooses PER catalogue service (owner, 2026-10-28): offered or not, where it is done
 * (at its premises / at the patient's home / both), whether insurance is accepted, and its price. Every field is validated; nothing else is accepted.
 */
export class ProviderServiceOfferDto {
  @IsBoolean() offered!: boolean;
  /** Required unless the provider stops offering the service. Nursing is done at home by default. */
  @IsOptional() @IsIn(['premises', 'home', 'both']) where?: 'premises' | 'home' | 'both';
  @IsOptional() @IsBoolean() insurance?: boolean;
  /** SAR. Optional: a service offered without a price shows no price to the patient. 0 is "no price". */
  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000) price?: number;
}
