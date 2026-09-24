import { IsOptional } from 'class-validator';

export class AddAddressDto {
  @IsOptional()
  is_default?: any;

}

export class UpdateAddressDto {
  @IsOptional()
  is_default?: any;

}
