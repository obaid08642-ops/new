import { IsArray, IsBoolean, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class PingPatientDto {
  @IsDefined()
  @IsString()
  patient_id: string;
}

export class MarkNoShowDto {
  @IsDefined()
  @IsString()
  appointment_id: string;
}

export class InitiateCallDto {
  @IsOptional()
  @IsString()
  callee_id?: string;

  @IsOptional()
  @IsIn(["voice", "video"])
  call_type?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}

export class SaveMetricsDto {
  @IsDefined()
  @IsArray()
  metrics: any[];
}

export class MuteParticipantDto {
  @IsDefined()
  @IsBoolean()
  muted: boolean;
}
