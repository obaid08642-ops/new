import { MaxLength, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddAddressDto {
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  // patient-web address form fields
  @IsOptional() @IsString() @MaxLength(160) line1?: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) district?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;

  // 19.7: the Saudi National Address short code (four letters, four digits). The server validates and looks it up;
  // an empty string on update removes it.
  @IsOptional() @IsString() @MaxLength(20) short_address?: string;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  // patient-web address form fields
  @IsOptional() @IsString() @MaxLength(160) line1?: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) district?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;

  // 19.7: the Saudi National Address short code (four letters, four digits). The server validates and looks it up;
  // an empty string on update removes it.
  @IsOptional() @IsString() @MaxLength(20) short_address?: string;
}
