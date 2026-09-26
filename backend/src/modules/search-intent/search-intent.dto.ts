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
}
