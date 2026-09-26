import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSurgeDto {
  @IsOptional() @IsNumber() @Min(0) @Max(23) startHour?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(23) endHour?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(5) multiplier?: number;
}

export class RulePatientDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsNumber() age?: number;
  @IsOptional() @IsIn(['male', 'female']) sex?: 'male' | 'female';
  @IsOptional() @IsArray() @IsString({ each: true }) chronic?: string[];
}

export class RuleInsuranceDto {
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() policy_number?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) eligible_services?: string[];
}

export class RuleServiceDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() min_age?: number;
  @IsOptional() @IsNumber() max_age?: number;
  @IsOptional() @IsIn(['male', 'female']) sex_restriction?: 'male' | 'female';
}

export class RuleProviderDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) accepted_insurance?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) capabilities?: string[];
}

export class RuleLocationDto {
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() city?: string;
}

export class ValidateRulesDto {
  @IsDefined()
  @IsIn(['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'])
  kind: 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

  @IsOptional() @ValidateNested() @Type(() => RulePatientDto) patient?: RulePatientDto;
  @IsOptional() @ValidateNested() @Type(() => RuleInsuranceDto) insurance?: RuleInsuranceDto;
  @IsOptional() @ValidateNested() @Type(() => RuleServiceDto) service?: RuleServiceDto;
  @IsOptional() @ValidateNested() @Type(() => RuleProviderDto) provider?: RuleProviderDto;
  @IsOptional() @IsDateString() scheduled_at?: string;
  @IsOptional() @ValidateNested() @Type(() => RuleLocationDto) location?: RuleLocationDto;
  @IsOptional() @IsIn(['cash', 'card', 'insurance']) payment_method?: 'cash' | 'card' | 'insurance';
  @IsOptional()
  @IsIn(['home_visit', 'online_consultation', 'in_clinic', 'pharmacy_delivery'])
  service_context?: 'home_visit' | 'online_consultation' | 'in_clinic' | 'pharmacy_delivery';
}
