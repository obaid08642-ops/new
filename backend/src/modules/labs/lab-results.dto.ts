import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  entries: any[];

  @IsOptional()
  @IsString()
  service_name_ar?: string;

  @IsOptional()
  @IsString()
  service_name_en?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  impression?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  notes?: string;

}
