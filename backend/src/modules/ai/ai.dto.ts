import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional() @IsIn(['gemini', 'openai', 'groq', 'cerebras', 'openrouter', 'deepseek', 'qwen', 'replicate']) provider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsNumber() daily_quota?: number;
}

export class UpdateAiProviderDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() api_key?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() vision_model?: string;
  @IsOptional() @IsNumber() daily_quota?: number;
  @IsOptional() @IsNumber() priority?: number;
}

export class TriageDto {
  @IsDefined()
  @IsString()
  symptoms: string;

  @IsOptional()
  @IsString()
  body_region?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  red_flags?: string[];
}

export class SkinAnalysisDto {
  @IsOptional()
  @IsString()
  image_base64?: string;

  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @IsBoolean()
  acknowledge_limitations?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observations?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class SetModeDto {
  @IsDefined()
  @IsIn(["auto", "manual"])
  mode: string;

  @IsOptional()
  @IsIn(['gemini', 'openai', 'groq', 'cerebras', 'openrouter', 'deepseek', 'qwen', 'replicate'])
  pinned?: 'gemini' | 'openai' | 'groq' | 'cerebras' | 'openrouter' | 'deepseek' | 'qwen' | 'replicate';
}
export class SetPurposeDto {
  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  @IsString()
  provider?: string;
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
