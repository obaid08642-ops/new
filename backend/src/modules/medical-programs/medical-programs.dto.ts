import { IsOptional, IsString } from 'class-validator';

export class CompleteDto {
  @IsOptional()
  @IsString()
  programType?: string;


  @IsOptional()
  @IsString()
  sessionId?: string;


}
