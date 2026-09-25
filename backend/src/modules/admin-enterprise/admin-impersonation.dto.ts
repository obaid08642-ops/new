import { IsOptional } from 'class-validator';

export class StartDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  user_id?: any;

  @IsOptional()
  minutes?: any;

}

export class RevokeDto {
  @IsOptional()
  reason?: any;

}
