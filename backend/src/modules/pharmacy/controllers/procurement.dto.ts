import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateProcurementRequestDto {
  @IsOptional()
  @IsArray()
  items?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class FeedbackDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  pharmacyFeedback?: any;

}

export class AnalyzeFileDto {
  @IsOptional()
  @IsString()
  file_base64?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
