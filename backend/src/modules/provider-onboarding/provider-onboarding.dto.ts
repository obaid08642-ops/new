import { IsDefined, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../../common/enums';

export class StartDto {
  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  password?: any;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsDefined()
  @IsEnum(ProviderType)
  type: ProviderType;

}

export class SubmitDto {
  @IsOptional()
  signer_name?: any;

  @IsOptional()
  signer_role?: any;

  @IsOptional()
  signature_url?: any;

  @IsOptional()
  lat?: any;

  @IsOptional()
  lng?: any;

  @IsOptional()
  @IsIn(["object"])
  full_data?: string;

}

export class AdminContractVisibilityDto {
  @IsOptional()
  visible?: any;

}
