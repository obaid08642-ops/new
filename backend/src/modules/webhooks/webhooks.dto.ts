import { IsOptional } from 'class-validator';

export class MoyasarDto {
  @IsOptional()
  event?: any;

  @IsOptional()
  data?: any;

  @IsOptional()
  id?: any;

}

export class PaytabsDto {
  tran_ref?: any;

}
