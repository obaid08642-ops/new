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
  @IsDefined()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class DeleteRoleDto {
  @IsDefined()
  @IsString()
  reason: string;
}

export class AssignUserRolesDto {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  custom_role_keys: string[];

  @IsDefined()
  @IsString()
  reason: string;
}
