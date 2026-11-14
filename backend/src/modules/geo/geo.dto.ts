import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { SAUDI_BOUNDS } from './geo-math';

/** GET /geo/reverse?lat=&lng= — a point inside the kingdom's bounding box (anything else is `outside_service_area`). */
export class ReverseGeocodeQueryDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng: number;
}

export const GEO_BOUNDS = SAUDI_BOUNDS;
