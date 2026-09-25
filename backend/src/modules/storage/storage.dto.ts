import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class UploadDto {
  @IsOptional()
  @IsString()
  mime?: string;


  @IsDefined()
  @IsString()
  data_base64: string;

  @IsOptional()
  @IsString()
  original_name?: string;


  @IsOptional()
  @IsString()
  owner_kind?: string;


  @IsOptional()
  visibility?: any;

  @IsOptional()
  @IsString()
  customKey?: string;


  @IsOptional()
  @IsIn(["cloudinary"])
  target: string;

  @IsOptional()
  @IsString()
  owner_account_id?: string;


}

export class UploadSuggestionImageDto {
  @IsOptional()
  @IsString()
  mime?: string;


  @IsDefined()
  @IsString()
  data_base64: string;

  @IsOptional()
  @IsString()
  original_name?: string;


  @IsOptional()
  @IsString()
  owner_kind?: string;


  @IsOptional()
  visibility?: any;

  @IsOptional()
  @IsString()
  customKey?: string;


  @IsOptional()
  @IsIn(["cloudinary"])
  target: string;

  @IsOptional()
  @IsString()
  owner_account_id?: string;


}
