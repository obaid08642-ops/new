import { IsDefined, IsOptional, IsString } from 'class-validator';

/** POST /admin/security/retention/holds: a legal hold on a user or a resource (the handler requires one of the two and a reason of 5+ characters). */
export class PlaceLegalHoldDto {
  // a hold needs a subject: at least one of user_id / resource_id, checked by the handler (`legal_hold_needs_a_subject`)
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsDefined()
  @IsString()
  reason: string;

  // an ISO date; an unreadable value is ignored by the handler (hold without an end date)
  @IsOptional()
  @IsString()
  until?: string;
}
