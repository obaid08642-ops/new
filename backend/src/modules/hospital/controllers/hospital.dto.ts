import { IsArray, IsBoolean, IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

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
  permissions?: any;
}
export class RespondInvitationDto {
  @IsOptional()
  @IsBoolean()
  accept?: boolean;
}
