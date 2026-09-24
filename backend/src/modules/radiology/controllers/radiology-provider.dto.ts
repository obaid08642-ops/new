import { IsArray, IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class AddMachineDto {
  @IsOptional()
  name?: any;

  @IsOptional()
  type?: any;

}

export class RespondBookingDto {
  @IsDefined()
  @IsBoolean()
  accept: boolean;
}
export class AllocateMachineDto {
  @IsDefined()
  @IsString()
  machineId: string;
}
export class FinalizeScanDto {
  @IsDefined()
  @IsString()
  reportText: string;

  @IsDefined()
  @IsArray()
  files: string[];

  @IsDefined()
  @IsString()
  pdfUrl: string;
}
