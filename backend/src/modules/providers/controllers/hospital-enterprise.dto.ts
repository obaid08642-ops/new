import { IsDefined, IsString } from 'class-validator';

export class GetBranchFinancialsDto {
  @IsDefined()
  @IsString()
  requestorId: string;
}
