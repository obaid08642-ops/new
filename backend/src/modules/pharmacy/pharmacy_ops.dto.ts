import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class SetInsuranceDto {
  @IsDefined()
  @IsIn(["approved", "rejected", "pending"])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
