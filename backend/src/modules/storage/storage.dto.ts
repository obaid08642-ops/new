import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class UploadDto {
  @IsOptional()
  mime?: any;

  @IsDefined()
  @IsString()
  data_base64: string;

  @IsOptional()
  original_name?: any;

  @IsOptional()
  owner_kind?: any;

  @IsOptional()
  visibility?: any;

  @IsOptional()
  customKey?: any;

  @IsOptional()
  @IsIn(["cloudinary"])
  target: string;

  @IsOptional()
  owner_account_id?: any;

}

export class UploadSuggestionImageDto {
  @IsOptional()
  mime?: any;

  @IsDefined()
  @IsString()
  data_base64: string;

  @IsOptional()
  original_name?: any;

  @IsOptional()
  owner_kind?: any;

  @IsOptional()
  visibility?: any;

  @IsOptional()
  customKey?: any;

  @IsOptional()
  @IsIn(["cloudinary"])
  target: string;

  @IsOptional()
  owner_account_id?: any;

}
