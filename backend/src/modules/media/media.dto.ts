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
  @IsDefined()
  @IsString()
  filename: string;

  @IsDefined()
  @IsString()
  mimetype: string;

  @IsDefined()
  @IsIn([...MEDIA_PURPOSES])
  purpose: (typeof MEDIA_PURPOSES)[number];

  @IsOptional()
  @IsString()
  thread_id?: string;
}
