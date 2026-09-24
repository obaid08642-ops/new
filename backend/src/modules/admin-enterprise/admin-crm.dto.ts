import { IsOptional } from 'class-validator';

export class CreateRequestDto {
  @IsOptional()
  user_id?: any;

  @IsOptional()
  type?: any;

}
