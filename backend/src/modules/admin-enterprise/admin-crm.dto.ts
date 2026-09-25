import { IsOptional, IsString } from 'class-validator';

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

}
