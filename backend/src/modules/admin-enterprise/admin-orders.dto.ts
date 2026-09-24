import { IsOptional } from 'class-validator';

export class CancelDto {
  @IsOptional()
  reason?: any;

}

export class RefundDto {
  @IsOptional()
  amount?: any;

  @IsOptional()
  mode?: any;

  @IsOptional()
  reason?: any;

}

export class CompensateDto {
  @IsOptional()
  amount?: any;

  @IsOptional()
  reason?: any;

}

export class ReassignDto {
  @IsOptional()
  provider_id?: any;

  @IsOptional()
  reason?: any;

}

export class AddInternalNoteDto {
  @IsOptional()
  note?: any;

}

export class SlaExtendDto {
  @IsOptional()
  hours?: any;

  @IsOptional()
  reason?: any;

}
