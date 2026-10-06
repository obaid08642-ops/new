import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';
import { MEDIA_PURPOSES } from './media.schema';

export class UploadMediaDto {
  @IsDefined()
  @IsIn([...MEDIA_PURPOSES])
  purpose: (typeof MEDIA_PURPOSES)[number];

  @IsOptional()
  @IsString()
  thread_id?: string;
}

export class PresignedUrlDto {
  @IsString()
  url: string;
  
  @IsString()
  key: string;
  
  @IsString()
  bucket: string;
  
  @IsString()
  method: string;
  
  @IsOptional()
  @IsString()
  fields?: Record<string, string>;
}

export class PresignedUrlRequestDto {
  @IsString()
  filename: string;
  
  @IsString()
  mimetype: string;
  
  @IsOptional()
  @IsString()
  purpose?: string;
  
  @IsOptional()
  @IsString()
  thread_id?: string;
}

