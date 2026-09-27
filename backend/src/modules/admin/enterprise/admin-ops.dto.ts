import { IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class RetryJobDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RetryFailedDto {
  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UpsertTranslationDto {
  @IsDefined()
  @IsString()
  key: string;

  @IsDefined()
  @IsString()
  lang: string;

  @IsDefined()
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetSeoControlDto {
  @IsDefined()
  @IsString()
  route_key: string;

  @IsDefined()
  @IsBoolean()
  indexable: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
