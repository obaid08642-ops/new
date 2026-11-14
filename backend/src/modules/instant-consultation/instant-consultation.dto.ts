import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

// Shape checks only. Specialty and mode rules are answered by InstantConsultationService with the stable codes
// (instant_specialty_required, instant_mode_invalid).

export class InstantRequestDto {
  /** The patient ticked "I agree" to the refund policy shown before payment (a missing field is let through while the rollout is optional, an explicit false is refused; a missing field is 400 refund_policy_acceptance_required once REFUND_POLICY_ACCEPTANCE=required). */
  @IsOptional()
  @IsBoolean()
  refund_policy_accepted?: boolean;

  /** The hash of the refund policy the patient's screen showed (GET /refund-policy/summary); a table changed since then is refused with 409 refund_policy_changed. Optional: old clients do not send it. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  refund_policy_hash?: string;

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
