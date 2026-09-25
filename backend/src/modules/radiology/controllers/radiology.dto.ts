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
  @IsString()
  scan_type_code?: string;

  @IsOptional()
  @IsString()
  scan_name_ar?: string;

  @IsOptional()
  @IsString()
  scan_name_en?: string;

  @IsOptional()
  @IsString()
  provider_account_id?: string;

  @IsOptional()
  @IsIn(['IN_CENTER', 'MOBILE_HOME_VISIT'])
  delivery_mode?: string;

  @IsOptional()
  @IsString()
  referring_doctor_id?: string;

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
