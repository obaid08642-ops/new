import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CancelDto {
  @IsOptional()
  @IsString()
  reason?: string;

}

export class RefundDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  @IsIn(['partial', 'full'])
  mode?: 'partial' | 'full';

  @IsOptional()
  @IsString()
  reason?: string;

}

export class CompensateDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  @IsString()
  reason?: string;

}

export class ReassignDto {
  @IsOptional()
  @IsString()
  provider_id?: string;


  @IsOptional()
  @IsString()
  reason?: string;

}

export class AddInternalNoteDto {
  @IsOptional()
  @IsString()
  note?: string;

}

export class SlaExtendDto {
  @IsOptional()
  @IsNumber()
  hours?: number;


  @IsOptional()
  @IsString()
  reason?: string;

}
