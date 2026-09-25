import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  report?: any;

  @IsOptional()
  frequency?: any;

  @IsDefined()
  @IsArray()
  recipients: any[];

  @IsOptional()
  hour_utc?: any;

  @IsOptional()
  format?: any;

  @IsOptional()
  enabled?: any;

}

export class UpdateDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsNumber()
  hour_utc?: number;
}

export class RemoveDto {
  @IsOptional()
  reason?: any;

}
