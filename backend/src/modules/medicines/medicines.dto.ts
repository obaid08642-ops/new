import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SuggestChangeDto {
  @IsOptional()
  @IsString()
  type?: string;


  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;


  @IsOptional()
  @IsString()
  id?: string;


  @IsOptional()
  @IsString()
  role?: string;


}

export class SuggestNewItemDto {
  @IsOptional()
  @IsString()
  id?: string;


  @IsOptional()
  @IsString()
  role?: string;


  @IsOptional()
  @IsString()
  note?: string;

}

export class AdminUpdateCatalogDto {
  @IsOptional()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  availability_status?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class AdminCreateDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class LookupBarcodeDto {
  @IsDefined()
  @IsString()
  code: string;
}
export class CompareDto {
  @IsDefined()
  @IsArray()
  ids: string[];
}
export class ReportShortageDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  quantity_available?: number;
}
export class RejectShortageDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
export class SetAvailabilityDto {
  @IsDefined()
  @IsString()
  status: string;
}
export class SuggestImageDto {
  @IsOptional()
  @IsString()
  storage_id?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
export class RejectImageDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
export class RejectChangeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
export class AdminDeleteDto {
  @IsOptional()
  @IsBoolean()
  restore?: boolean;
}
export class ImportJsonDto {
  @IsDefined()
  @IsArray()
  rows: any[];

  @IsOptional()
  @IsBoolean()
  auto_approve?: boolean;
}
export class ImportCsvDto {
  @IsDefined()
  @IsString()
  csv: string;

  @IsOptional()
  @IsBoolean()
  auto_approve?: boolean;
}

export class ManualEntryDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  active_ingredient?: string;

  @IsOptional()
  @IsString()
  generic_name?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sub_category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

  @IsOptional()
  @IsString()
  dosage_ar?: string;

  @IsOptional()
  @IsString()
  dosage_en?: string;

  @IsOptional()
  @IsString()
  form?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  usage_instructions_ar?: string;

  @IsOptional()
  @IsString()
  usage_instructions_en?: string;

  @IsOptional()
  @IsBoolean()
  requires_prescription?: boolean;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indications_ar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indications_en?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications_ar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications_en?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings_ar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings_en?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  side_effects_ar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  side_effects_en?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  precautions_ar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  precautions_en?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interactions?: string[];

  @IsOptional()
  @IsString()
  package_size?: string;

  @IsOptional()
  @IsString()
  storage_conditions?: string;
}

export class ApproveChangeDto {
  @IsOptional()
  @IsObject()
  overrides?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approved_fields?: string[];
}
