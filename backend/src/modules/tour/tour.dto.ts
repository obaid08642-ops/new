import { IsString, MaxLength } from 'class-validator';

export class CompleteTourStepDto {
  @IsString()
  @MaxLength(100)
  stepId!: string;
}
