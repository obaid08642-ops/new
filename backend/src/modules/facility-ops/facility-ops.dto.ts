import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsOptional()
  @IsString()
  department_id?: string;

  @IsDefined()
  @IsString()
  user_id: string;

  @IsDefined()
  @IsString()
  start_time: string;

  @IsDefined()
  @IsString()
  end_time: string;

  @IsDefined()
  @IsString()
  day_of_week: string;

}

export class CreateAnnouncementDto {
  @IsDefined()
  @IsString()
  text: string;
}

export class CreateResourceDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  branch_id?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsIn(['active', 'maintenance', 'inactive'])
  status?: 'active' | 'maintenance' | 'inactive';

  @IsOptional()
  @IsNumber()
  capacity?: number;
}

export class CreateWardDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsNumber()
  total_beds: number;
}
export class AdmitDto {
  @IsDefined()
  @IsString()
  patient_id: string;

  @IsDefined()
  @IsString()
  bed_id: string;
}
export class CheckInDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class BookSurgeryDto {
  @IsDefined() @IsString() patient_id: string;
  @IsDefined() @IsString() primary_surgeon_id: string;
  @IsOptional() @IsArray() @IsString({ each: true }) assistants?: string[];
  @IsDefined() @IsString() ot_room_number: string;
  @IsDefined() @IsDateString() scheduled_at: string;
  @IsDefined() @IsNumber() duration_mins: number;
}
