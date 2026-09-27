import { IsIn, IsOptional, IsString } from 'class-validator';

export class RejectPayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

}
