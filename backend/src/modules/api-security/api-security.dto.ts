import { IsDefined, IsString } from 'class-validator';

export class ClearDto {
  @IsDefined()
  @IsString()
  key: string;
}
