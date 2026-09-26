import { IsArray, IsDateString, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class AddEventDto {
  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  ref_id?: string;


  @IsOptional()
  @IsDateString()
  event_date?: string;


  @IsOptional()
  @IsString()
  member_user_id: string;

  @IsOptional()
  @IsString()
  member?: string;


  @IsOptional()
  @IsString()
  time?: string;


  @IsOptional()
  @IsString()
  color?: string;


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
