import { IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  kind?: any;

  @IsOptional()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;

  @IsOptional()
  doctor_notes?: any;

  @IsOptional()
  doctor_name?: any;

  @IsOptional()
  prescription_image?: any;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  priority?: any;

}

export class UpdateStatusDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  note?: any;

}
