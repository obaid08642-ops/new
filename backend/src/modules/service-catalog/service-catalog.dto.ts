import { IsOptional } from 'class-validator';

export class CreateDto {
  @IsOptional()
  name_ar?: any;

  @IsOptional()
  name_en?: any;

  @IsOptional()
  price?: any;

  @IsOptional()
  active?: any;

  @IsOptional()
  unavailable?: any;

}

export class ToggleDto {
  @IsOptional()
  active?: any;

}

export class ApproveDto {
  @IsOptional()
  approve?: any;

}

export class OfferingDto {
  @IsOptional()
  price?: any;

  @IsOptional()
  available?: any;
}
