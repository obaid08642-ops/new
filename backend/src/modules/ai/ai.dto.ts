import { IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class TriageDto {
  @IsOptional()
  symptoms?: any;

  @IsOptional()
  body_region?: any;

  @IsOptional()
  region?: any;

  @IsOptional()
  red_flags?: any;

}

export class SkinAnalysisDto {
  @IsOptional()
  image_base64?: any;

  @IsOptional()
  imageBase64?: any;

  @IsOptional()
  acknowledge_limitations?: any;

  @IsOptional()
  areas?: any;

  @IsOptional()
  observations?: any;

  @IsOptional()
  note?: any;

}

export class SetModeDto {
  @IsDefined()
  @IsIn(["auto", "manual"])
  mode: string;

  @IsOptional()
  pinned?: any;
}
export class SetPurposeDto {
  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  provider?: any;
}
export class VoiceDto {
  @IsOptional()
  @IsString()
  transcript?: string;
}
export class OcrDto {
  @IsOptional()
  @IsString()
  image_base64?: string;

  @IsOptional()
  @IsString()
  imageBase64?: string;
}
export class CopilotSuggestDto {
  @IsDefined()
  @IsString()
  notes: string;
}
export class OcrTranslateDto {
  @IsDefined()
  @IsString()
  image_base64: string;

  @IsOptional()
  @IsString()
  target_lang?: string;
}
export class MedicineImageSearchDto {
  @IsDefined()
  @IsString()
  image_base64: string;
}
export class BarcodeLookupDto {
  @IsDefined()
  @IsString()
  code: string;
}
export class AnalyzeMealDto {
  @IsDefined()
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  image_base64?: string;
}
export class GenerateExercisePlanDto {
  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  days_per_week?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
export class GenerateDietPlanDto {
  @IsDefined()
  @IsString()
  goal: string;

  @IsDefined()
  @IsString()
  gender: string;

  @IsDefined()
  @IsNumber()
  weight: number;

  @IsDefined()
  @IsNumber()
  height: number;

  @IsDefined()
  @IsNumber()
  age: number;

  @IsDefined()
  @IsNumber()
  targetWeight: number;

  @IsDefined()
  @IsString()
  activity: string;

  @IsDefined()
  @IsString()
  diet: string;

  @IsDefined()
  @IsString()
  allergies: string;
}
