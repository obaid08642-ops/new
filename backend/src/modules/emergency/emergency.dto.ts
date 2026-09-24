import { IsDefined, IsOptional, IsString } from 'class-validator';

export class TriggerDto {
  @IsOptional()
  location?: any;

  @IsOptional()
  symptoms?: any;

  @IsOptional()
  severity?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  full_name?: any;

  @IsOptional()
  phone?: any;

}

export class TrackDto {
  @IsOptional()
  lat?: any;

  @IsOptional()
  lng?: any;

  @IsOptional()
  vehicle_id?: any;

}

export class ResolveDto {
  @IsOptional()
  notes?: any;

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
