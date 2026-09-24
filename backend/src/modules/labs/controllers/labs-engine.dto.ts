import { IsArray, IsBoolean, IsDefined, IsNumber, IsString } from 'class-validator';

export class RespondToBookingDto {
  @IsDefined()
  @IsBoolean()
  accept: boolean;

  @IsDefined()
  @IsString()
  lab_id: string;
}

export class CollectSampleDto {
  @IsDefined()
  @IsString()
  barcodeToken: string;
}

export class FinalizeTestDto {
  @IsDefined()
  @IsArray()
  metricResults: any[];

  @IsDefined()
  @IsString()
  pdfUrl: string;
}

export class UpdateCatalogDto {
  @IsDefined()
  @IsString()
  lab_id: string;

  @IsDefined()
  @IsString()
  test_code: string;

  @IsDefined()
  @IsString()
  test_name_ar: string;

  @IsDefined()
  @IsString()
  test_name_en: string;

  @IsDefined()
  @IsNumber()
  in_lab_price: number;

  @IsDefined()
  @IsNumber()
  home_collection_price: number;

  @IsDefined()
  @IsBoolean()
  accepts_insurance: boolean;

  @IsDefined()
  @IsArray()
  reference_ranges: any[];
}
