import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsOptional()
  text?: any;

  collection?: any;

}

export class CreateResourceDto {
  @IsOptional()
  name_ar?: any;

  @IsOptional()
  name_en?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  @IsString()
  branch_id: string;

  @IsOptional()
  capacity?: any;

  collection?: any;

}

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsString()
  name_en: string;

  @IsOptional()
  status?: any;

  @IsOptional()
  @IsNumber()
  capacity?: number;


  collection?: any;

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
