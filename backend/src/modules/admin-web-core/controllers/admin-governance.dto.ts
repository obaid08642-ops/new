import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class TriggerEmergencyMaintenanceDto {
  @IsDefined()
  @IsBoolean()
  forceMaintenanceState: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
