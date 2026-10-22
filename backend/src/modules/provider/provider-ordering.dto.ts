import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

// Shape checks only. Business rules (modes offered, price ranges, insurer classes, catalogue lookups) are answered
// by ProviderOrderingService with the stable error codes the clients show (ordering_modes_required, item_price_invalid…).

export class OrderingSettingsDto {
  @IsArray()
  modes: string[];

  @IsOptional()
  @IsNumber()
  home_fee?: number;

  @IsOptional()
  @IsNumber()
  home_radius_km?: number;

  @IsOptional()
  @IsBoolean()
  auto_accept?: boolean;

  @IsOptional()
  @IsBoolean()
  walk_in?: boolean;

  @IsOptional()
  @IsArray()
  staff_genders?: string[];

  // each entry: { company_id, classes, active } (checked in the service)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  accepted_insurance?: Array<Record<string, unknown>>;
}

export class OrderingItemDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  @IsString()
  catalog_id: string;

  @IsOptional()
  @IsArray()
  modes?: string[];

  // { home?: number, facility?: number } (checked in the service)
  @IsOptional()
  @IsObject()
  prices?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  accepted_insurance?: Array<Record<string, unknown>> | null;

  @IsOptional()
  @IsNumber()
  turnaround_hours?: number;

  // { ar?: string, en?: string }
  @IsOptional()
  @IsObject()
  preparation?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class OrderingBulkPriceDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  @IsIn(['home', 'facility'])
  mode: 'home' | 'facility';

  // exactly one of percent / set_price (checked in the service)
  @IsOptional()
  @IsNumber()
  percent?: number;

  @IsOptional()
  @IsNumber()
  set_price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  catalog_ids?: string[];
}

export class OrderingCopyModeDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  @IsIn(['home', 'facility'])
  from: 'home' | 'facility';

  @IsIn(['home', 'facility'])
  to: 'home' | 'facility';
}

export class OrderingImportDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  @IsString()
  csv: string;
}
