import { IsArray, IsDefined, IsOptional, IsString, Matches } from 'class-validator';

// The apps carry UUID ids; rows made by older tools carry Mongo ObjectIds. Both are accepted and resolved by the controller.
export const REFERRAL_ID = /^(?:[0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export class IssueReferralsDto {
  @IsString() @Matches(REFERRAL_ID) appointmentId: string;
  @IsString() @Matches(REFERRAL_ID) patientId: string;
  @IsString() @Matches(REFERRAL_ID) doctorId: string;
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
