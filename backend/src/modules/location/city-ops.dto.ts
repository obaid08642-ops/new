import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMinSize,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const LAUNCHABLE_SERVICES = [
  'pharmacy_delivery',
  'home_healthcare',
  'lab_collection',
  'telemedicine',
  'cod',
] as const;
export type LaunchableService = (typeof LAUNCHABLE_SERVICES)[number];

export function isLaunchableService(v: string): v is LaunchableService {
  return (LAUNCHABLE_SERVICES as readonly string[]).includes(v);
}

export class GeoPointDto {
  @IsDefined()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsDefined()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class ZoneRulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(500)
  maxDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  capacityPerDay?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedServices?: string[];
}

export class CreateServiceAreaDto {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  code: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameAr: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEn: string;

  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cityCode: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  polygon: GeoPointDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneRulesDto)
  zoneRules?: ZoneRulesDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class UpdateServiceAreaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  polygon?: GeoPointDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneRulesDto)
  zoneRules?: ZoneRulesDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetLaunchSwitchDto {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cityCode: string;

  @IsDefined()
  @IsIn([...LAUNCHABLE_SERVICES])
  service: LaunchableService;

  @IsDefined()
  @IsBoolean()
  enabled: boolean;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}
