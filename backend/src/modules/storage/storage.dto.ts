import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export const STORAGE_UPLOAD_PURPOSES = ['avatar', 'order_prescription', 'document', 'general', 'kyc', 'profile'] as const;
export type StorageUploadPurpose = (typeof STORAGE_UPLOAD_PURPOSES)[number];

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
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  customKey?: string;

  @IsOptional()
  @IsIn(['r2', 'cloudinary'])
  target?: string;

  @IsOptional()
  @IsString()
  owner_account_id?: string;

  @IsOptional()
  @IsIn([...STORAGE_UPLOAD_PURPOSES])
  purpose?: StorageUploadPurpose;
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
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  customKey?: string;

  @IsOptional()
  @IsIn(['r2', 'cloudinary'])
  target?: string;

  @IsOptional()
  @IsString()
  owner_account_id?: string;

  @IsOptional()
  @IsIn([...STORAGE_UPLOAD_PURPOSES])
  purpose?: StorageUploadPurpose;
}
