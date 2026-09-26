import { IsArray, IsDefined, IsString } from 'class-validator';

export class SubmitIndexNowDto {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  urls: string[];
}
