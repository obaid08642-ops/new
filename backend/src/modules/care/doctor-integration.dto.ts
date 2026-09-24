import { IsOptional } from 'class-validator';

export class FinalizeEncounterDto {
  @IsOptional()
  appointmentId?: any;

  @IsOptional()
  patientId?: any;

  @IsOptional()
  doctorId?: any;

  @IsOptional()
  diagnosisText?: any;

  @IsOptional()
  medications?: any;

  @IsOptional()
  insuranceSnapshot?: any;

}
