import { IsDateString, IsOptional } from 'class-validator';

export class MarkDto {
  @IsOptional()
  code?: any;

  @IsOptional()
  baby_id?: any;

  @IsOptional()
  @IsDateString()
  taken_at?: string;


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
