import { IsArray, IsMongoId, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SynchronizeDoctorSettingsDto {
  @IsMongoId()
  doctorId: string;

  @IsOptional() @IsNumber() priceClinic?: number;
  @IsOptional() @IsNumber() priceOnline?: number;
  @IsOptional() @IsNumber() priceHome?: number;
  @IsOptional() @IsNumber() maxRadius?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) networks?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class EncounterMedicationDto {
  @IsOptional() @IsMongoId() medicine_id?: string;
  @IsOptional() @IsString() trade_name?: string;
  @IsOptional() @IsString() dosage?: string;
  @IsOptional() @IsNumber() duration_days?: number;
  @IsOptional() @IsString() frequency?: string;
}

export class InsuranceSnapshotDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() pre_auth_reference_code?: string;
  @IsOptional() @IsNumber() coverage_percentage?: number;
  @IsOptional() @IsNumber() patient_copay_amount?: number;
  @IsOptional() @IsString() carrier_name?: string;
}

export class FinalizeEncounterDto {
  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  doctorId?: string;

  @IsOptional()
  @IsString()
  diagnosisText?: string;

  @IsOptional()
  @IsArray()
  medications?: EncounterMedicationDto[];

  @IsOptional()
  @IsObject()
  insuranceSnapshot?: InsuranceSnapshotDto;

}
