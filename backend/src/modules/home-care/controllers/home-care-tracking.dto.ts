import { IsArray, IsDefined, IsNumber, IsOptional } from 'class-validator';

export class RequestSuppliesDto {
  @IsOptional()
  bookingId?: any;

  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  priority?: any;

}

export class VerifyAttendanceDto {
  @IsDefined()
  @IsNumber()
  nurseLat: number;

  @IsDefined()
  @IsNumber()
  nurseLng: number;
}
