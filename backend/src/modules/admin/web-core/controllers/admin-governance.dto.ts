import { IsBoolean, IsDefined, IsString, MinLength } from 'class-validator';

export class TriggerEmergencyMaintenanceDto {
  @IsDefined()
  @IsBoolean()
  forceMaintenanceState: boolean;

  // Issues 955 / 995: the reason is mandatory and audited.
  @IsDefined()
  @IsString()
  @MinLength(5)
  reason!: string;
}
