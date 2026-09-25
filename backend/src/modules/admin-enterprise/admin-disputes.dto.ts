import { IsOptional } from 'class-validator';

export class ResolveDto {
  @IsOptional()
  decision?: any;

  reason?: any;

  @IsOptional()
  amount?: any;

  @IsOptional()
  action?: any;

  actor?: any;

  @IsOptional()
  target_type?: any;

  @IsOptional()
  target_id?: any;

  before?: any;

  after?: any;

  meta?: any;

  ip?: any;

  user_agent?: any;

}
