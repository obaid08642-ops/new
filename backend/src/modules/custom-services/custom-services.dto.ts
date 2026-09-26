import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  name_ar: string;

  @IsDefined()
  @IsString()
  name_en: string;

  @IsOptional()
  @IsString()
  doctor_notes?: string;

  @IsOptional()
  @IsString()
  doctor_name?: string;

  @IsOptional()
  @IsString()
  prescription_image?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];


  @IsOptional()
  @IsString()
  priority?: string;


}

export class UpdateStatusDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

}
