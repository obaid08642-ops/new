import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** RFC 7591 §2 client metadata that MCP clients (ChatGPT, Claude, …) send. */
export class RegisterClientDto {
  @IsString()
  @MaxLength(120)
  client_name: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  redirect_uris: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grant_types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  response_types?: string[];

  @IsOptional()
  @IsString()
  token_endpoint_auth_method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  client_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logo_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  scope?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contacts?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  tos_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  policy_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  software_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  software_version?: string;
}

/** OAuth 2.1 authorization request parameters (query on GET, body on POST). */
export class AuthorizeQueryDto {
  @IsOptional() @IsString() @MaxLength(20) response_type?: string;
  @IsOptional() @IsString() @MaxLength(200) client_id?: string;
  @IsOptional() @IsString() @MaxLength(2048) redirect_uri?: string;
  @IsOptional() @IsString() @MaxLength(200) code_challenge?: string;
  @IsOptional() @IsString() @MaxLength(20) code_challenge_method?: string;
  @IsOptional() @IsString() @MaxLength(500) scope?: string;
  @IsOptional() @IsString() @MaxLength(500) state?: string;
  @IsOptional() @IsString() @MaxLength(2048) resource?: string;
}

export class AuthorizeDecisionDto extends AuthorizeQueryDto {
  @IsIn(['approve', 'deny'])
  decision: 'approve' | 'deny';
}

/** RFC 6749 §4.1.3 / §6 token request (application/x-www-form-urlencoded or JSON). */
export class TokenRequestDto {
  @IsString() @MaxLength(40) grant_type: string;
  @IsOptional() @IsString() @MaxLength(200) code?: string;
  @IsOptional() @IsString() @MaxLength(2048) redirect_uri?: string;
  @IsOptional() @IsString() @MaxLength(200) client_id?: string;
  @IsOptional() @IsString() @MaxLength(200) code_verifier?: string;
  @IsOptional() @IsString() @MaxLength(200) refresh_token?: string;
  @IsOptional() @IsString() @MaxLength(2048) resource?: string;
  @IsOptional() @IsString() @MaxLength(500) scope?: string;
}

/** RFC 7009 §2.1 revocation request. */
export class RevokeRequestDto {
  @IsOptional() @IsString() @MaxLength(4096) token?: string;
  @IsOptional() @IsString() @MaxLength(40) token_type_hint?: string;
  @IsOptional() @IsString() @MaxLength(200) client_id?: string;
}

export class AdminCreateAgentClientDto {
  @IsString()
  @MaxLength(120)
  client_name: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  redirect_uris: string[];

  @IsOptional() @IsString() @MaxLength(2048) client_uri?: string;
  @IsOptional() @IsString() @MaxLength(2048) logo_uri?: string;
}

export class AdminUpdateAgentClientDto {
  @IsBoolean()
  blocked: boolean;
}
