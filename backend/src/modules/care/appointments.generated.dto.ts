import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

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
