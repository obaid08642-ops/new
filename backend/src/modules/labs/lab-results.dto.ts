import { IsArray, IsOptional } from 'class-validator';

export class CreateDto {
  @IsOptional()
  booking_id?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  @IsArray()
  entries: any[];

  @IsOptional()
  service_name_ar?: any;

  @IsOptional()
  service_name_en?: any;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


  @IsOptional()
  findings?: any;

  @IsOptional()
  impression?: any;

  @IsOptional()
  recommendations?: any;

  @IsOptional()
  notes?: any;

}
