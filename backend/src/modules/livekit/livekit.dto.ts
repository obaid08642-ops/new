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

  /** The client can run a peer-to-peer call (CALLS_P2P_ENABLED); absent means LiveKit only. */
  @IsOptional()
  @IsBoolean()
  supports_p2p?: boolean;
}

export class JoinCallDto {
  @IsOptional()
  @IsBoolean()
  supports_p2p?: boolean;
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

export class FallbackDto {
  @IsDefined()
  @IsIn(['ice_failed', 'no_relay', 'timeout', 'unsupported'])
  reason: string;
}

export class MediaPathDto {
  @IsDefined()
  @IsIn(['direct', 'relay'])
  path: 'direct' | 'relay';
}
