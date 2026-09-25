import { IsOptional } from 'class-validator';

export class MarkDto {
  @IsOptional()
  code?: any;

  @IsOptional()
  baby_id?: any;

  taken_at?: any;

}

export class OneDto {
  @IsOptional()
  kind?: any;

  @IsOptional()
  event?: any;

  @IsOptional()
  screen?: any;

  @IsOptional()
  meta?: any;

  @IsOptional()
  data?: any;

}
