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
  @IsArray()
  requirements?: unknown[];


  @IsOptional()
  salary_range?: any;

  @IsOptional()
  facility_id?: any;

  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  company?: any;

  @IsOptional()
  contact_phone?: any;

  @IsOptional()
  contact_preference?: any;

  @IsOptional()
  nationality?: any;

  @IsOptional()
  @IsNumber()
  experience_years?: number;


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
  @IsNumber()
  experience_years?: number;


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
