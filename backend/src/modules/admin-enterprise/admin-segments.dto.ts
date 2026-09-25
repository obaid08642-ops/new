import { IsOptional } from 'class-validator';

export class PreviewDto {
  @IsOptional()
  definition?: any;

}

export class CreateDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  definition?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  description_ar?: any;

}

export class RemoveDto {
  reason?: any;

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
