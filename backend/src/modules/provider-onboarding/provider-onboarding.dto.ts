import { IsDefined, IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../../common/enums';

export class StartDto {
  @IsDefined()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  password?: string;


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
  @IsNumber()
  lat?: number;


  @IsOptional()
  @IsNumber()
  lng?: number;


  @IsOptional()
  @IsIn(["object"])
  full_data?: string;

}

export class AdminContractVisibilityDto {
  @IsOptional()
  visible?: any;

}
