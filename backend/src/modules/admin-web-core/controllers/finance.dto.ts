import { IsOptional } from 'class-validator';

export class RejectPayoutDto {
  @IsOptional()
  reason?: any;

}
