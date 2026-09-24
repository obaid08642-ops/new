import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class BookDto {
  @IsOptional()
  doctor_id?: any;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  type?: any;

  contact?: any;

  @IsOptional()
  @IsIn(["insurance"])
  payment_method: string;

  @IsOptional()
  insurance_provider?: any;

  @IsOptional()
  @IsArray()
  documents: any[];

  @IsOptional()
  reason?: any;

  @IsOptional()
  address?: any;

}

export class TrDto {
  @IsOptional()
  state?: any;

}

export class PostMsgDto {
  @IsOptional()
  text?: any;

}

export class AvailDto {
  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsBoolean()
  is_accepting?: boolean;
}
