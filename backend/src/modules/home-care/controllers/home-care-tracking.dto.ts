import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestSuppliesDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  priority?: string;

}

export class VerifyAttendanceDto {
  @IsDefined()
  @IsNumber()
  nurseLat: number;

  @IsDefined()
  @IsNumber()
  nurseLng: number;
}
