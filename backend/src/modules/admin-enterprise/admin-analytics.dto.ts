import { IsArray, IsDefined, IsOptional } from 'class-validator';

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
  enabled?: any;

  @IsDefined()
  @IsArray()
  recipients: any[];

  @IsOptional()
  hour_utc?: any;

}

export class RemoveDto {
  @IsOptional()
  reason?: any;

}
