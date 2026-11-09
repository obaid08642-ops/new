import { IsDefined, IsString, MaxLength } from 'class-validator';

export class SehaNumberDto {
  /** The number of the sick leave the doctor registered on Seha (shape checked: 6-30 letters, digits or hyphens). */
  @IsDefined()
  @IsString()
  @MaxLength(60)
  seha_number: string;
}

export class RevokeSickLeaveDto {
  /** Why the certificate is withdrawn; stored with the revoke and shown to the patient. */
  @IsDefined()
  @IsString()
  @MaxLength(500)
  reason: string;
}
