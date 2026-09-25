import { IsArray, IsBoolean, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddMachineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

}

export class RespondBookingDto {
  @IsDefined()
  @IsBoolean()
  accept: boolean;
}
export class AllocateMachineDto {
  @IsDefined()
  @IsString()
  machineId: string;
}
export class FinalizeScanDto {
  @IsDefined()
  @IsString()
  reportText: string;

  @IsDefined()
  @IsArray()
  files: string[];

  @IsDefined()
  @IsString()
  pdfUrl: string;
}

export class UpdateRadiologyCatalogItemDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() cash_availability?: boolean;
  @IsOptional() @IsBoolean() home_visit_supported?: boolean;
  @IsOptional() @IsNumber() estimated_duration_minutes?: number;
  @IsOptional() @IsNumber() price?: number;
}
