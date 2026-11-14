import { IsArray, IsDefined, IsIn, IsOptional, IsString, ValidateNested, registerDecorator, ValidationOptions } from 'class-validator';
import { Type } from 'class-transformer';

const isScalar = (v: unknown) =>
  typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

/**
 * A segment value reaches a Mongo query, so it must be plain data: a string, a finite number,
 * a boolean (an ISO date is a string), or a list (max 500) of those. Objects (and so any "$operator") are rejected.
 */
export function isSafeSegmentValue(v: unknown): boolean {
  if (Array.isArray(v)) return v.length <= 500 && v.every(isScalar);
  return isScalar(v);
}

function IsSafeSegmentValue(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isSafeSegmentValue',
      target: object.constructor,
      propertyName,
      options,
      validator: { validate: (v: unknown) => isSafeSegmentValue(v) },
    });
}

export class SegmentRuleDto {
  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  op?: string;

  // the value a rule compares with: string, finite number, boolean, ISO date string, or a list (max 500) of those; never an object
  @IsOptional()
  @IsSafeSegmentValue()
  value?: unknown;

  // the upper bound of a `between` rule: same allowed shapes as `value`
  @IsOptional()
  @IsSafeSegmentValue()
  value2?: unknown;
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
