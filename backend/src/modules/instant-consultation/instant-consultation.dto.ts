import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Shape checks only. Specialty and mode rules are answered by InstantConsultationService with the stable codes
// (instant_specialty_required, instant_mode_invalid).

export class InstantRequestDto {
  /** The patient ticked "I agree" to the refund policy shown before payment (a patient's create is refused with 400 refund_policy_acceptance_required without it). */
  @IsOptional()
  @IsBoolean()
  refund_policy_accepted?: boolean;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  family_member_id?: string;
}

export class InstantAvailabilityDto {
  @IsBoolean()
  available: boolean;
}
