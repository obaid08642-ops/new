import { IsArray, IsBoolean, IsDefined, IsEmail, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsDefined() @IsString() city: string;
  @IsDefined() @IsString() district: string;
  @IsDefined() @IsObject() coordinates: { latitude: number; longitude: number };
  @IsDefined() @IsString() contact_number: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateDepartmentDto {
  @IsDefined() @IsString() branch_id: string;
  @IsDefined() @IsString() name_ar: string;
  @IsDefined() @IsString() name_en: string;
  @IsDefined() @IsString() specialty_code: string;
  @IsOptional() @IsNumber() consultation_fee?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class AddStaffDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsDefined()
  @IsString()
  full_name: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsString()
  password: string;

  @IsDefined()
  @IsString()
  staff_role: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  scfhs?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  branch_id?: string;

  @IsOptional()
  @IsString()
  department_id?: string;
}

export class OnboardDoctorDto {
  @IsDefined()
  @IsString()
  doctor_id: string;
}
export class UpdateAppointmentStatusDto {
  @IsDefined()
  @IsString()
  status: string;
}
export class CreateInvitationDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;
}
export class RespondInvitationDto {
  @IsOptional()
  @IsBoolean()
  accept?: boolean;
}
