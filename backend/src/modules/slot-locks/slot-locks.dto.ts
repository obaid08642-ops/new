import { IsDefined, IsOptional, IsString } from 'class-validator';

export class ReserveDto {
  @IsDefined()
  @IsString()
  provider_id: string;

  @IsDefined()
  @IsString()
  booking_kind: string;

  @IsDefined()
  @IsString()
  slot_start: string;

  @IsOptional()
  @IsString()
  slot_end?: string;


}
