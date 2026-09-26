import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  patient_id: string;

  @IsDefined()
  @IsString()
  appointment_id: string;

  @IsOptional()
  @IsArray()
  items?: unknown[];

  @IsOptional()
  @IsArray()
  erx?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  labs?: unknown[];

  @IsOptional()
  @IsArray()
  radiology?: unknown[];

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  provider_profile_id?: string;
}

export class UploadDto {
  @IsDefined()
  @IsString()
  upload_image: string;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class ManualEntryDto {
  @IsDefined()
  @IsString()
  patient_id: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  provider_profile_id?: string;
}

export class SendDto {
  @IsOptional()
  @IsString()
  pharmacy_id?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class TransitionDto {
  @IsDefined()
  @IsString()
  to: string;
}
export class SubDto {
  @IsDefined()
  @IsNumber()
  item_index: number;

  @IsDefined()
  @IsString()
  new_medicine_id: string;
}
