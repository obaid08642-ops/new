import { IsArray, IsBoolean, IsDefined, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  blood_type?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronic_diseases?: string[];

  @IsOptional()
  @IsArray()
  allergies?: unknown[];

  @IsOptional()
  @IsArray()
  current_medications?: unknown[];

  @IsOptional()
  @IsArray()
  emergency_contacts?: unknown[];

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  marital_status?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  smoking_status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class NotificationChannelsDto {
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class NotificationCategoriesDto {
  @IsOptional()
  @IsBoolean()
  appointments?: boolean;

  @IsOptional()
  @IsBoolean()
  orders?: boolean;

  @IsOptional()
  @IsBoolean()
  health?: boolean;

  @IsOptional()
  @IsBoolean()
  chat?: boolean;

  @IsOptional()
  @IsBoolean()
  account?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  channels?: NotificationChannelsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationCategoriesDto)
  categories?: NotificationCategoriesDto;

  // Client flat toggles (notifications-settings.tsx sends { [key]: boolean } where key is general/appointments/orders/offers/medications/doctorMessages/emergency/sound/vibration)
  @IsOptional()
  @IsBoolean()
  general?: boolean;

  @IsOptional()
  @IsBoolean()
  offers?: boolean;

  @IsOptional()
  @IsBoolean()
  medications?: boolean;

  @IsOptional()
  @IsBoolean()
  doctorMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @IsOptional()
  @IsBoolean()
  sound?: boolean;

  @IsOptional()
  @IsBoolean()
  vibration?: boolean;
}

export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  location?: boolean;

  @IsOptional()
  @IsBoolean()
  analytics?: boolean;

  @IsOptional()
  @IsBoolean()
  shareData?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @IsOptional()
  @IsBoolean()
  thirdParty?: boolean;

  @IsOptional()
  @IsBoolean()
  profile_visible?: boolean;

  @IsOptional()
  @IsBoolean()
  share_data?: boolean;
}

export class UpdateSecuritySettingsDto {
  @IsOptional()
  @IsBoolean()
  biometric?: boolean;

  @IsOptional()
  @IsBoolean()
  two_factor?: boolean;
}
