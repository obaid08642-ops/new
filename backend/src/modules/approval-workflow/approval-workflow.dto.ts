import { IsDefined, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsIn(['medicine', 'provider', 'facility', 'service'])
  entity_type: 'medicine' | 'provider' | 'facility' | 'service';

  @IsOptional()
  @IsString()
  entity_id?: string;

  @IsDefined()
  @IsObject()
  change_data: Record<string, unknown>;
}

export class DecideDto {
  @IsDefined()
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  edit_data?: Record<string, unknown>;
}
