import { IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateManualBoostDto {
  @IsDefined() @IsIn(['doctor', 'pharmacy', 'lab', 'radiology', 'home_care', 'ambulance']) entity_type: string;
  @IsDefined() @IsString() entity_id: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsString() reason?: string;
  @IsDefined() @IsDateString() starts_at: string;
  @IsDefined() @IsDateString() ends_at: string;
}
