import { IsBoolean, IsDefined } from 'class-validator';

export class TriggerEmergencyMaintenanceDto {
  @IsDefined()
  @IsBoolean()
  forceMaintenanceState: boolean;
}
