import { IsOptional, IsString } from 'class-validator';

export class ResolveDto {
  resolution: any;

  @IsOptional()
  @IsString()
  reason?: string;
}
