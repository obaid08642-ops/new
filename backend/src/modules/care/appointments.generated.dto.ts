import { IsObject, IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class FinishAppointmentDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  prescription?: Array<{ name?: string; dose?: string; duration?: string }>;

  @IsOptional()
  @IsBoolean()
  follow_up_recommended?: boolean;

  @IsOptional()
  @IsNumber()
  follow_up_window_days?: number;


}

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
