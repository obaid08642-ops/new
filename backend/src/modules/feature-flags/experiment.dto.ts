import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExperimentVariantDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;
}

export class ExperimentGuardrailDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  metric: string;

  @IsDefined()
  @IsNumber()
  threshold: number;

  @IsDefined()
  @IsIn(['max', 'min'])
  direction: 'max' | 'min';
}

export class CreateExperimentDto {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  key: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  hypothesis: string;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants: ExperimentVariantDto[];

  @IsDefined()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  salt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentGuardrailDto)
  guardrails?: ExperimentGuardrailDto[];

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class AssignVariantDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subjectId: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class RecordConversionDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subjectId: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class ReportObservationsDto {
  @IsOptional()
  @IsObject()
  metrics?: Record<string, number>;
}
