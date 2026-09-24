import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class EnrollDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class SetLockDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
