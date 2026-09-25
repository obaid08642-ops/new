import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class OnlineDto {
  @IsOptional()
  location?: any;
}

export class LocationDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;
}

export class DeliverDto {
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  photo?: string;
}
