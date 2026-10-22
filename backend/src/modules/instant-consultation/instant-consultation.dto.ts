import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Shape checks only. Specialty and mode rules are answered by InstantConsultationService with the stable codes
// (instant_specialty_required, instant_mode_invalid).

export class InstantRequestDto {
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
