import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { LabBookingState } from '../../schemas/lab.schema';
import { AttributionDto } from '../../common/attribution';

export class BookDto {
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

  @IsDefined()
  @IsArray()
  items: unknown[];

  @IsDefined()
  @IsString()
  scheduled_at: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  location_type?: string;

  @IsOptional()
  @IsString()
  provider_account_id?: string;

  @IsOptional()
  @IsArray()
  documents?: unknown[];

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  facility_id?: string;

  @IsOptional()
  address?: unknown;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  insurance_provider?: string;

  @IsOptional()
  @IsString()
  insurance_member_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;

}

export class TransitionDto {
  @IsDefined()
  @IsEnum(LabBookingState)
  state: LabBookingState;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UploadDocDto {
  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  url_or_b64?: string;

  @IsOptional()
  @IsString()
  data_url?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  uploaded_at?: string;
}

export class UpdateInsDto {
  @IsOptional()
  @IsString()
  status?: string;

  // D-37: the insurer's approval number, required to approve.
  @IsOptional()
  @IsString()
  approval_ref?: string;

  // The insurer's rejection reason (sent by the provider app on reject).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsNumber()
  totalCopay?: number;


  @IsOptional()
  @IsArray()
  items?: unknown[];

}

export class OptInCashDto {
  @IsOptional()
  @IsBoolean()
  optInCash?: boolean;


}

export class AssignTechDto {
  @IsOptional()
  @IsString()
  technician_id?: string;


  @IsOptional()
  @IsString()
  technician_name?: string;


  @IsOptional()
  @IsString()
  notes?: string;


}

export class UploadReportDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  mime?: string;

  @IsOptional()
  @IsString()
  base64?: string;

  @IsOptional()
  @IsString()
  url?: string;

  /** The report file the lab uploaded through POST /storage/upload (private, owned, scanned). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  report_storage_object_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  send_to?: string;

  @IsOptional()
  @IsArray()
  structuredData: unknown[];
}

export class RescheduleDto {
  @IsOptional()
  @IsDateString()
  new_date?: string;


  @IsOptional()
  @IsString()
  reason?: string;

}

export class UpdateGpsDto {
  @IsOptional()
  @IsNumber()
  lat?: number;


  @IsOptional()
  @IsNumber()
  lng?: number;


  @IsOptional()
  @IsNumber()
  eta?: number;


  @IsOptional()
  @IsNumber()
  distance?: number;


}

export class DeclareEmergencyDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RegisterSampleDto {
  @IsDefined()
  @IsString()
  lab_order_id: string;

  @IsDefined()
  @IsString()
  barcode: string;

  @IsDefined()
  @IsArray()
  tests: any[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ForceStateDto {
  @IsDefined()
  @IsEnum(LabBookingState)
  state: LabBookingState;

  @IsOptional()
  @IsString()
  note?: string;

}

export class UpdateStageDto {
  @IsDefined()
  @IsIn(['received', 'analyzing', 'result_ready', 'sent'])
  stage: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// Admin catalog editor (admin/src/pages/admin/catalog-manager.tsx). medical_review_status publishes/unpublishes.
export class CreateLabCatalogDto {
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsOptional() @IsString() short_code?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsDefined() @IsString() category: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsDefined() @IsNumber() price: number;
  @IsOptional() @IsNumber() old_price?: number;
  @IsOptional() @IsBoolean() fasting_required?: boolean;
  @IsOptional() @IsNumber() fasting_hours?: number;
  @IsOptional() @IsBoolean() home_visit_supported?: boolean;
  @IsOptional() @IsBoolean() facility_visit_supported?: boolean;
  @IsOptional() @IsNumber() turnaround_hours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ur?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_hi?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_bn?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_tl?: string[];
  @IsOptional() @IsBoolean() is_package?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) included_services?: string[];
  @IsOptional() @IsNumber() popularity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() unavailable?: boolean;
  @IsOptional() @IsBoolean() medical_referral_required?: boolean;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) medical_review_status?: string;
}

export class UpdateLabCatalogDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() short_code?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sample_type?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() old_price?: number;
  @IsOptional() @IsBoolean() fasting_required?: boolean;
  @IsOptional() @IsNumber() fasting_hours?: number;
  @IsOptional() @IsBoolean() home_visit_supported?: boolean;
  @IsOptional() @IsBoolean() facility_visit_supported?: boolean;
  @IsOptional() @IsNumber() turnaround_hours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_ur?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_hi?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_bn?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preparation_tl?: string[];
  @IsOptional() @IsBoolean() is_package?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) included_services?: string[];
  @IsOptional() @IsNumber() popularity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() unavailable?: boolean;
  @IsOptional() @IsBoolean() medical_referral_required?: boolean;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) medical_review_status?: string;
}

export class ApproveCatalogDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}

export class BulkApproveCatalogDto {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}

/** PUT labs/provider/slot-capacity: how many bookings the lab takes at the same time slot. */
export class SlotCapacityDto {
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(20)
  slot_capacity: number;
}
