import { IsOptional } from 'class-validator';

export class CompleteDto {
  @IsOptional()
  programType?: any;

  @IsOptional()
  sessionId?: any;

}
