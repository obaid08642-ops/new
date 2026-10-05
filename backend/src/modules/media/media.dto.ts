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

