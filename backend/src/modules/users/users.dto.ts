import { IsOptional, IsString } from 'class-validator';

export class UpdateDisplayDto {
  @IsOptional()
  @IsString()
  display_name: string;

  @IsOptional()
  @IsString()
  locale: string;

  @IsOptional()
  @IsString()
  avatar_media_id: string;

  @IsOptional()
  gender?: any;

  @IsOptional()
  birth_date?: any;

  @IsOptional()
  height_cm?: any;

  @IsOptional()
  weight_kg?: any;

  @IsOptional()
  blood_type?: any;

}

export class ChangePasswordDto {
  @IsOptional()
  current_password?: any;

  @IsOptional()
  new_password?: any;

}
