import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BackfillSlugsDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
