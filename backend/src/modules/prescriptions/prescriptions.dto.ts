import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
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
  id?: any;

  @IsOptional()
  account_id?: any;

  @IsOptional()
  provider_id?: any;

  @IsOptional()
  provider_profile_id?: any;
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
  id?: any;

  @IsOptional()
  role?: any;
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
  id?: any;

  @IsOptional()
  account_id?: any;

  @IsOptional()
  provider_id?: any;

  @IsOptional()
  provider_profile_id?: any;
}

export class SendDto {
  @IsOptional()
  @IsString()
  pharmacy_id: string;

  @IsOptional()
  state?: any;

  model?: any;

  isPrivilegedAdmin?: any;

  isOwningDoctor?: any;

  findOne?: any;

}

export class TransitionDto {
  to: any;
}
export class SubDto {
  @IsDefined()
  @IsNumber()
  item_index: number;

  @IsDefined()
  @IsString()
  new_medicine_id: string;
}
