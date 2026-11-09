import { IsDefined, IsString, MaxLength } from 'class-validator';

export class RevokeSickLeaveDto {
  /** Why the certificate is withdrawn; stored with the revoke and shown to the patient. */
  @IsDefined()
  @IsString()
  @MaxLength(500)
  reason: string;
}
