import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class AddStaffDto {
  user_id: any;

  @IsOptional()
  @IsOptional()
  branch_id?: any;

  @IsOptional()
  @IsOptional()
  department_id?: any;

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
