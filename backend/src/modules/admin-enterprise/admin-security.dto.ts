import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  reason?: any;

  @IsOptional()
  key?: any;

  @IsOptional()
  name_ar?: any;

  @IsOptional()
  system_protected_keys?: any;

  @IsOptional()
  permissions?: any;

  @IsOptional()
  description_ar?: any;

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

export class UpdateRoleDto {
  reason?: any;

  @IsOptional()
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsString()
  description_ar: string;

  @IsOptional()
  permissions?: any;

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

export class DeleteRoleDto {
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

export class AssignUserRolesDto {
  @IsDefined()
  @IsArray()
  custom_role_keys: any[];

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
