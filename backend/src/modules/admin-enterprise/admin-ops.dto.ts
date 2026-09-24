import { IsOptional, IsString } from 'class-validator';

export class RetryJobDto {
  retry?: any;

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

export class RetryFailedDto {
  reason?: any;

  @IsOptional()
  limit?: any;

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

export class UpsertTranslationDto {
  @IsOptional()
  key?: any;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  lang: string;

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

export class SetSeoControlDto {
  @IsOptional()
  route_key?: any;

  @IsOptional()
  @IsString()
  indexable: string;

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
