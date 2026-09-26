import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class MarkDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  baby_id?: string;

  @IsOptional()
  @IsDateString()
  taken_at?: string;


}

export class OneDto {
  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  screen?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

}
