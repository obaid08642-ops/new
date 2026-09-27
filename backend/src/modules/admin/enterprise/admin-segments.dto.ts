import { IsArray, IsDefined, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SegmentRuleDto {
  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  op?: string;
}

export class SegmentDefinitionDto {
  @IsOptional()
  @IsIn(['all', 'any'])
  match?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentRuleDto)
  rules?: SegmentRuleDto[];
}

export class PreviewDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentDefinitionDto)
  definition?: SegmentDefinitionDto;

}

export class CreateDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentDefinitionDto)
  definition?: SegmentDefinitionDto;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

}

export class RemoveDto {
  @IsDefined()
  @IsString()
  reason: string;
}
