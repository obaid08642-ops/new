import { IsOptional, IsString } from 'class-validator';

export class CreateDto {
  entity_type: any;

  @IsOptional()
  @IsString()
  entity_id?: string;

  change_data: any;
}

export class DecideDto {
  decision: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  edit_data?: any;
}
