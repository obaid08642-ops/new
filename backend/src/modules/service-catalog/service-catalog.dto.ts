import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateDto {
  @IsOptional()
  name_ar?: any;

  @IsOptional()
  name_en?: any;

  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsBoolean()
  active?: boolean;


  @IsOptional()
  unavailable?: any;

}

export class ToggleDto {
  @IsOptional()
  active?: any;

}

export class ApproveDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;


}

export class OfferingDto {
  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsBoolean()
  available?: boolean;

}
