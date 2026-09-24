import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsOptional()
  @IsString()
  facility_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsDefined()
  @IsString()
  start_date: string;

  @IsDefined()
  @IsString()
  end_date: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  provider_name?: string;

  @IsOptional()
  @IsString()
  provider_type?: string;
}

export class UpdateLeaveRequestDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsIn(["approved", "rejected"])
  action: string;

  @IsOptional()
  @IsString()
  note?: string;
}
