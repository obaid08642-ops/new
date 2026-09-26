import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class MarkDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsIn(['pending', 'verified', 'approved', 'rejected'])
  insurance_status?: 'pending' | 'verified' | 'approved' | 'rejected';

}

export class AddAttDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  mime: string;

  @IsDefined()
  @IsString()
  base64: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
