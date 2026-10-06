import { IsArray, IsDefined, IsNumber, IsObject, IsOptional, IsString, MaxLength, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class NursingVitalsDto {
  @IsOptional() @IsString() @MaxLength(20) bp?: string;
  @IsOptional() @IsString() @MaxLength(20) pulse?: string;
  @IsOptional() @IsString() @MaxLength(20) temp?: string;
  @IsOptional() @IsString() @MaxLength(20) spo2?: string;
  @IsOptional() @IsString() @MaxLength(20) glucose?: string;
}

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  note?: string;

  // provider-app NursingDashboard sends { bp, pulse, temp, spo2, glucose } (text inputs); the service keeps those keys.
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NursingVitalsDto)
  vitals?: NursingVitalsDto;

}

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsNumber()
  sessions_count?: number;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  address?: unknown;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  service_name_ar?: string;
}

export class ArriveAtPatientDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;
}
export class TriggerEmergencyDto {
  @IsDefined()
  @IsString()
  reason: string;
}

export class CompleteVisitDto {
  @IsOptional() @IsObject() vitals?: Record<string, unknown>;
  @IsOptional() @IsString() clinical_notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) recommendations?: string[];
  @IsOptional() @IsString() signature_base64?: string;
  // P22.4: proof of visit — photo URL and/or the handover code shown to the patient.
  @IsOptional() @IsString() photo_proof_url?: string;
  @IsOptional() @IsString() visit_code?: string;
}

export class VisitPositionDto {
  @IsDefined() @IsNumber() lat: number;
  @IsDefined() @IsNumber() lng: number;
}

// Admin catalog editor (admin/src/pages/admin/catalog-manager.tsx). medical_review_status publishes/unpublishes.
export class CreateHomeCareCatalogDto {
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsDefined() @IsString() category: string;
  @IsOptional() @IsString() icon?: string;
  @IsDefined() @IsNumber() price: number;
  @IsDefined() @IsString() duration: string;
  @IsOptional() @IsNumber() duration_value?: number;
  @IsOptional() @IsBoolean() requires_patient_medication?: boolean;
  @IsOptional() @IsBoolean() requires_companion?: boolean;
  @IsOptional() @IsBoolean() cash_availability?: boolean;
  @IsOptional() @IsBoolean() insurance_availability?: boolean;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() popularity?: number;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) medical_review_status?: string;
}

export class UpdateHomeCareCatalogDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() description_ar?: string;
  @IsOptional() @IsString() description_en?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsNumber() duration_value?: number;
  @IsOptional() @IsBoolean() requires_patient_medication?: boolean;
  @IsOptional() @IsBoolean() requires_companion?: boolean;
  @IsOptional() @IsBoolean() cash_availability?: boolean;
  @IsOptional() @IsBoolean() insurance_availability?: boolean;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() popularity?: number;
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
