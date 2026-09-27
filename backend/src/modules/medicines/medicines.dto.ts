import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  image?: string;
}

/**
 * Catalog medicine fields an admin may set: exactly MedicinesService.EDITABLE_FIELDS (the service
 * picks the same list). admin/src/pages/admin/medicines-catalog.tsx sends the whole form on create
 * and edit; before this the create DTO allowed only `reason`, so no medicine could be added.
 */
export class CatalogMedicineFieldsDto {
  @IsOptional() @IsString() @MaxLength(300) name_ar?: string;
  @IsOptional() @IsString() @MaxLength(300) name_en?: string;
  @IsOptional() @IsString() @MaxLength(300) active_ingredient?: string;
  @IsOptional() @IsString() @MaxLength(300) generic_name?: string;
  @IsOptional() @IsString() @MaxLength(300) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(300) category?: string;
  @IsOptional() @IsString() @MaxLength(300) sub_category?: string;
  @IsOptional() @IsString() @MaxLength(300) brand?: string;
  @IsOptional() @IsString() @MaxLength(300) form?: string;
  @IsOptional() @IsString() @MaxLength(300) strength?: string;
  @IsOptional() @IsString() @MaxLength(300) barcode?: string;
  @IsOptional() @IsString() @MaxLength(300) package_size?: string;
  @IsOptional() @IsString() @MaxLength(300) storage_conditions?: string;
  @IsOptional() @IsString() @MaxLength(5000) description_ar?: string;
  @IsOptional() @IsString() @MaxLength(5000) description_en?: string;
  @IsOptional() @IsString() @MaxLength(5000) dosage_ar?: string;
  @IsOptional() @IsString() @MaxLength(5000) dosage_en?: string;
  @IsOptional() @IsString() @MaxLength(5000) usage_instructions_ar?: string;
  @IsOptional() @IsString() @MaxLength(5000) usage_instructions_en?: string;
  @IsOptional() @IsString() @MaxLength(2000) image?: string;
  @IsOptional() @IsBoolean() requires_prescription?: boolean;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) indications_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) indications_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) contraindications_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) contraindications_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) warnings_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) warnings_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) side_effects_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) side_effects_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) precautions_ar?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) precautions_en?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) interactions?: string[];
  // audit note (price history / change log)
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AdminUpdateCatalogDto extends CatalogMedicineFieldsDto {
  @IsOptional()
  @IsString()
  availability_status?: string;
}

export class AdminCreateDto extends CatalogMedicineFieldsDto {}

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
