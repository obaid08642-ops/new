import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class UpsertDto {
  reason?: any;

  @IsOptional()
  title_ar?: any;

  @IsDefined()
  @IsArray()
  tags: any[];

  @IsOptional()
  @IsString()
  slug: string;

  @IsOptional()
  id?: any;

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

export class PublishDto {
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

export class ScheduleDto {
  @IsOptional()
  reason?: any;

  @IsOptional()
  scheduled_at?: any;

}

export class UnpublishDto {
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
