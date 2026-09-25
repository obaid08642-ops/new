import { IsArray, IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

export class IssueReferralsDto {
  @IsMongoId() appointmentId: string;
  @IsMongoId() patientId: string;
  @IsMongoId() doctorId: string;
  @IsOptional() @IsArray() @IsString({ each: true }) labTests?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) radScans?: string[];
  @IsOptional() @IsString() homeCareNotes?: string;
  @IsOptional() @IsArray() medications?: Record<string, unknown>[];
}

export class DiagnosticCallbackDto {
  @IsDefined()
  @IsArray()
  fileUrls: string[];
}
