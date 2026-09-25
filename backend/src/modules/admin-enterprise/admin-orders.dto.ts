import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CancelDto {
  @IsOptional()
  reason?: any;

}

export class RefundDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  mode?: any;

  @IsOptional()
  reason?: any;

}

export class CompensateDto {
  @IsOptional()
  @IsNumber()
  amount?: number;


  @IsOptional()
  reason?: any;

}

export class ReassignDto {
  @IsOptional()
  @IsString()
  provider_id?: string;


  @IsOptional()
  reason?: any;

}

export class AddInternalNoteDto {
  @IsOptional()
  note?: any;

}

export class SlaExtendDto {
  @IsOptional()
  @IsNumber()
  hours?: number;


  @IsOptional()
  reason?: any;

}
