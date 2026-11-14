import { IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../../schemas/appointment.schema';
import { AttributionDto } from '../../common/attribution';

export class VisitLocationDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateAppointmentDto {
  /** The patient ticked "I agree" to the refund policy shown before payment (a missing field is let through while the rollout is optional, an explicit false is refused; a missing field is 400 refund_policy_acceptance_required once REFUND_POLICY_ACCEPTANCE=required). */
  @IsOptional()
  @IsBoolean()
  refund_policy_accepted?: boolean;

  /** The hash of the refund policy the patient's screen showed (GET /refund-policy/summary); a table changed since then is refused with 409 refund_policy_changed. Optional: old clients do not send it. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  refund_policy_hash?: string;

  /** Owner decision 1: the family member this is FOR (the caller stays the booker and payer); checked server-side, see common/family-member.ts. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  family_member_id?: string;

  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @IsDefined()
  @IsString()
  @IsIn(['clinic', 'video', 'home'])
  service_type: ServiceType;

  @IsString()
  @IsNotEmpty()
  slot_start: string;

  // The chosen slot's length (the web sends it from the slot); bounded like the slot endpoints (10-120 minutes).
  @IsInt()
  @Min(10)
  @Max(120)
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  patient_notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  symptoms?: string[];

  @ValidateNested()
  @Type(() => VisitLocationDto)
  @IsOptional()
  visit_location?: VisitLocationDto;

  @IsString()
  @IsIn(['cash', 'card', 'insurance'])
  @IsOptional()
  payment_method?: 'cash' | 'card' | 'insurance';

  /** PT-08: the patient asks for a sick leave with this consultation. A request, not a guarantee: the doctor decides (SickLeaveService.issue). */
  @IsOptional()
  @IsBoolean()
  sick_leave_requested?: boolean;

  /** Issue 684: book on behalf of a family member (AppointmentsService checks the family group and the booking permission). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  for_member_id?: string;

  @IsString()
  @IsOptional()
  insurance_provider?: string;

  @IsString()
  @IsOptional()
  insurance_member_id?: string;

  @IsString()
  @IsOptional()
  slot_lock_id?: string; // optional 10-min hold id from POST /slot-locks/reserve

  @IsString()
  @IsOptional()
  follow_up_of?: string;

  @ValidateNested()
  @Type(() => AttributionDto)
  @IsOptional()
  attribution?: AttributionDto;
}

export class CancelAppointmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  slot_start: string;
}

export class JoinWaitlistDto {
  @IsDefined()
  @IsString()
  doctorId: string;

  @IsDefined()
  @IsString()
  date: string;
}

/** 2-app#3: the doctor's position while on the way to a home visit. */
export class DoctorPositionDto {
  @IsNumber() @Min(-90) @Max(90) lat: number;
  @IsNumber() @Min(-180) @Max(180) lng: number;
}
