import { IsOptional } from 'class-validator';

export class CreateRequestDto {
  @IsOptional()
  type?: any;

}
