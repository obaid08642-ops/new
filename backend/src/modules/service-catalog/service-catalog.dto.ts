import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsBoolean()
  active?: boolean;


  @IsOptional()
  @IsBoolean()
  unavailable?: boolean;

}

export class ToggleDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

}

export class ApproveDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;


}

export class OfferingDto {
  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsBoolean()
  available?: boolean;

}

export class UpdateServiceDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() unavailable?: boolean;
}

export class ProviderScheduleDto {
  // Weekly schedule keys are day names and their block structures are provider-defined.
  @IsOptional() @IsObject() weekly?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) blocked_dates?: string[];
  @IsOptional() @IsNumber() slot_minutes?: number;
  @IsOptional() @IsNumber() max_per_slot?: number;
  @IsOptional() @IsNumber() coverage_radius_km?: number;
  @IsOptional() @IsBoolean() is_online?: boolean;
}
