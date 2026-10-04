import { IsDefined, IsOptional, IsString } from 'class-validator';

export class ExtractIntentDto {
  @IsDefined()
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  client_type?: string;

  /** 13.R7: category/scope passthrough for scoped search (optional). */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
