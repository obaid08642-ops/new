import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StartDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsNumber()
  minutes?: number;

}

export class RevokeDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
