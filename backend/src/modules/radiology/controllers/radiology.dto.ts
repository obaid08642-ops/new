import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class BookDto {
  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  location_type?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  scan_type_code?: any;

  @IsOptional()
  scan_name_ar?: any;

  @IsOptional()
  scan_name_en?: any;

  @IsOptional()
  provider_account_id?: any;

  @IsOptional()
  @IsIn(["MOBILE_HOME_VISIT"])
  delivery_mode: string;

  @IsOptional()
  referring_doctor_id?: any;

}

export class AllocateMachineDto {
  @IsDefined()
  @IsString()
  machineId: string;
}
export class FinalizeScanDto {
  @IsDefined()
  @IsString()
  reportText: string;

  @IsDefined()
  @IsArray()
  files: string[];

  @IsDefined()
  @IsString()
  pdfUrl: string;
}
