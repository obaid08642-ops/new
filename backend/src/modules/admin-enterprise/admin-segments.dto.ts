import { IsDefined, IsOptional, IsString } from 'class-validator';

export class PreviewDto {
  @IsOptional()
  definition?: any;

}

export class CreateDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  definition?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  description_ar?: any;

}

export class RemoveDto {
  @IsDefined()
  @IsString()
  reason: string;
}
