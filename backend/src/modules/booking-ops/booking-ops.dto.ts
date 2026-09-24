import { IsDefined, IsOptional, IsString } from 'class-validator';

export class MarkDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  insurance_status?: any;
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
