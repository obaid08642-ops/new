import { IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerDto {
  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class TrackDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  vehicle_id?: string;

  @IsOptional()
  @IsBoolean()
  arrived?: boolean;
}

export class ResolveDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClaimDto {
  @IsOptional()
  @IsString()
  vehicle_id?: string;
}
export class AssignDto {
  @IsDefined()
  @IsString()
  hospital_id: string;
}
