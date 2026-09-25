import { IsArray, IsDefined } from 'class-validator';

export class DiagnosticCallbackDto {
  @IsDefined()
  @IsArray()
  fileUrls: string[];
}
