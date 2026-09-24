import { IsArray, IsDefined, IsOptional } from 'class-validator';

export class FinishAppointmentDto {
  @IsOptional()
  @IsArray()
  diagnosis: any[];

  @IsOptional()
  @IsArray()
  notes: any[];

  @IsOptional()
  @IsArray()
  recommendations: any[];

  @IsDefined()
  @IsArray()
  prescription: any[];

  @IsOptional()
  follow_up_recommended?: any;

  @IsOptional()
  follow_up_window_days?: any;

}

export class CancelDto {
  @IsOptional()
  reason?: any;

}
