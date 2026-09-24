import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SubmitDto {
  @IsOptional()
  comment?: any;
  @IsDefined()
  @IsString()
  entity_type: string;

  @IsDefined()
  @IsString()
  entity_id: string;

  @IsDefined()
  @IsString()
  provider_id: string;

  @IsDefined()
  @IsNumber()
  score: number;

}
