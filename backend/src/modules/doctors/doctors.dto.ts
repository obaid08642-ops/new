import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class BookDto {
  @IsDefined()
  @IsString()
  doctor_id: string;

  @IsDefined()
  @IsDateString()
  scheduled_at: string;

  @IsDefined()
  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['cash', 'card', 'insurance'])
  payment_method?: string;

  @IsOptional()
  @IsString()
  insurance_provider?: string;

  @IsOptional()
  @IsArray()
  documents: any[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

}

export class TrDto {
  @IsOptional()
  @IsIn(['scheduled', 'confirmed', 'patient_arrived', 'in_consultation', 'completed', 'cancelled', 'no_show'])
  state?: 'scheduled' | 'confirmed' | 'patient_arrived' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';
}

export class PostMsgDto {
  @IsOptional()
  @IsString()
  text?: string;

}

export class AvailDto {
  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsBoolean()
  is_accepting?: boolean;
}

export class ConsultationNoteDto {
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() follow_up_instructions?: string;
  @IsOptional() @IsArray() @IsObject({ each: true }) prescriptions?: Record<string, unknown>[];
}
