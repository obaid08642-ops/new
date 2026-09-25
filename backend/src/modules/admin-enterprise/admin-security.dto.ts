import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsDefined()
  @IsString()
  reason: string;

  @IsDefined()
  @IsString()
  key: string;

  @IsDefined()
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  system_protected_keys?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  description_ar?: string;
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
