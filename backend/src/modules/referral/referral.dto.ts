import { IsDefined, IsString } from 'class-validator';

export class ApplyDto {
  @IsDefined()
  @IsString()
  code: string;

  @IsDefined()
  @IsString()
  deviceId: string;

  @IsDefined()
  @IsString()
  phone: string;
}
