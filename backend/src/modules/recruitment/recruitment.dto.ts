import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertCandidateProfileDto {
  @IsOptional()
  cv_url?: any;

  experiences?: any;

  scfhs_license_number?: any;

  scfhs_license_status?: any;

  scfhs_license_expiry?: any;

  skills?: any;

}

export class CreateJobDto {
  @IsOptional()
  title?: any;

  @IsOptional()
  description?: any;

  @IsOptional()
  @IsString()
  scfhs_role: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  @IsIn(["request"])
  post_type: string;

  @IsOptional()
  requirements?: any;

  @IsOptional()
  salary_range?: any;

  @IsOptional()
  facility_id?: any;

  @IsOptional()
  status?: any;

  @IsOptional()
  company?: any;

  @IsOptional()
  contact_phone?: any;

  @IsOptional()
  contact_preference?: any;

  @IsOptional()
  nationality?: any;

  @IsOptional()
  experience_years?: any;

  @IsOptional()
  contract_type?: any;

}

export class UpdateJobDto {
  title?: any;

  description?: any;

  requirements?: any;

  scfhs_role?: any;

  location?: any;

  salary_range?: any;

  status?: any;

}

export class GuestPostDto {
  @IsOptional()
  device_id?: any;

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
  salary_range?: any;

  @IsOptional()
  @IsIn(["request"])
  post_type: string;

  @IsOptional()
  company?: any;

  @IsOptional()
  contact_phone?: any;

  @IsOptional()
  contact_preference?: any;

  @IsOptional()
  nationality?: any;

  @IsOptional()
  experience_years?: any;

  @IsOptional()
  contract_type?: any;

}

export class GuestApplyDto {
  @IsOptional()
  device_id?: any;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  cover_letter?: any;

}

export class ApplyForJobDto {
  @IsOptional()
  cover_letter?: any;

}

export class UpdateApplicationStatusDto {
  @IsDefined()
  @IsString()
  status: string;
}
