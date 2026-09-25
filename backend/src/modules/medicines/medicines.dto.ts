import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SuggestChangeDto {
  @IsOptional()
  type?: any;

  @IsOptional()
  changes?: any;

  @IsOptional()
  note?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  role?: any;

}

export class SuggestNewItemDto {
  @IsOptional()
  id?: any;

  @IsOptional()
  role?: any;

  @IsOptional()
  note?: any;

}

export class AdminUpdateCatalogDto {
  @IsOptional()
  @IsString()
  reason: string;

  @IsOptional()
  availability_status?: any;

  @IsOptional()
  image?: any;

}

export class AdminCreateDto {
  @IsOptional()
  reason?: any;

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
