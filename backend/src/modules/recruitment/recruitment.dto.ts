import { IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertCandidateProfileDto {
  @IsOptional()
  @IsString()
  cv_url?: string;

  @IsOptional()
  @IsArray()
  experiences?: unknown[];

  @IsOptional()
  @IsString()
  scfhs_license_number?: string;

  @IsOptional()
  @IsString()
  scfhs_license_status?: string;

  @IsOptional()
  @IsString()
  scfhs_license_expiry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class CreateJobDto {
  @IsDefined()
  @IsString()
  title: string;

  @IsDefined()
  @IsString()
  description: string;

  @IsDefined()
  @IsIn(['doctor', 'pharmacist', 'nurse', 'lab', 'radiology'])
  scfhs_role: string;

  @IsDefined()
  @IsString()
  location: string;

  @IsOptional()
  @IsIn(['request', 'offer'])
  post_type: string;

  @IsOptional()
  @IsArray()
  requirements?: unknown[];


  @IsOptional()
  @IsString()
  salary_range?: string;

  @IsOptional()
  @IsString()
  facility_id?: string;

  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsString()
  contact_preference?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsNumber()
  experience_years?: number;


  @IsOptional()
  @IsString()
  contract_type?: string;

}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsIn(['doctor', 'pharmacist', 'nurse', 'lab', 'radiology'])
  scfhs_role?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  salary_range?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class GuestPostDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  scfhs_role: string;

  @IsOptional()
  @IsString()
  salary_range?: string;

  @IsOptional()
  @IsIn(['request', 'offer'])
  post_type?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsString()
  contact_preference?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsNumber()
  experience_years?: number;

  @IsOptional()
  @IsString()
  contract_type?: string;
}

export class GuestApplyDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  cover_letter?: string;
}

export class ApplyForJobDto {
  @IsOptional()
  @IsString()
  cover_letter?: string;
}

export class UpdateApplicationStatusDto {
  @IsDefined()
  @IsString()
  status: string;
}
