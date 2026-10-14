import { IsDefined, IsNumber, Max, Min } from 'class-validator';

/** D-14: "send my location to my emergency contacts". */
export class ShareLocationDto {
  @IsDefined() @IsNumber() @Min(-90) @Max(90) lat: number;
  @IsDefined() @IsNumber() @Min(-180) @Max(180) lng: number;
}
