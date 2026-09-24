import { IsOptional } from 'class-validator';

export class UpdateSurgeDto {
  @IsOptional()
  surgeConfig?: any;

}
