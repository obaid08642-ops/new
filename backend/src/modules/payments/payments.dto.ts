import { IsOptional } from 'class-validator';

export class ConstructorDto {
  data?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  payment_intent?: any;

}
