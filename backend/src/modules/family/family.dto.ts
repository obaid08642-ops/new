import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class AddEventDto {
  @IsOptional()
  description?: any;

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  ref_id?: any;

  @IsOptional()
  event_date?: any;

  @IsOptional()
  @IsString()
  member_user_id: string;

  @IsOptional()
  member?: any;

  @IsOptional()
  time?: any;

  @IsOptional()
  color?: any;

  @IsDefined()
  @IsString()
  title: string;

}

export class CreateDto {
  @IsDefined()
  @IsString()
  name: string;
}
export class InviteDto {
  @IsDefined()
  @IsIn(["sms", "email"])
  channel: string;

  @IsDefined()
  @IsString()
  target: string;
}
export class JoinDto {
  @IsDefined()
  @IsString()
  invite_code: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  relation?: string;
}
export class SetRelationDto {
  @IsDefined()
  @IsString()
  relation: string;
}
export class SetContractPermissionsDto {
  @IsDefined()
  @IsArray()
  scopes: string[];
}
export class SetPermissionsDto {
  @IsDefined()
  @IsArray()
  permissions: string[];
}
export class RequestPermissionsDto {
  @IsDefined()
  @IsString()
  target_member_id: string;

  @IsDefined()
  @IsArray()
  permissions: string[];
}
export class RespondPermissionDto {
  @IsDefined()
  @IsIn(["approved", "rejected"])
  decision: "approved" | "rejected";

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}
