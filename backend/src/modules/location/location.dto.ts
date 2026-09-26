import { IsDefined, IsString } from 'class-validator';

export class ResolveLocationDto {
  @IsDefined()
  @IsString()
  text: string;
}
