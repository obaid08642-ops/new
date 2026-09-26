import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveDto {
  @IsOptional()
  @IsIn(['force_complete', 'force_cancel'])
  resolution?: 'force_complete' | 'force_cancel';


  @IsOptional()
  @IsString()
  reason?: string;
}
