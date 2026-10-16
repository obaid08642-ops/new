import { IsBoolean, IsDefined, IsString, MinLength } from 'class-validator';

export class SetKillSwitchDto {
  @IsDefined()
  @IsBoolean()
  value!: boolean;

  @IsDefined()
  @IsString()
  @MinLength(5)
  reason!: string;
}
