import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  serviceType: string;

  @IsOptional()
  reason?: any;

  @IsOptional()
  orderId?: any;

  @IsOptional()
  is_opened?: any;

  @IsOptional()
  is_used?: any;

  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  details?: any;

  @IsOptional()
  refundMethod?: any;

  @IsOptional()
  attachedDocs?: any;

}

export class DecideDto {
  @IsDefined()
  @IsIn(["approved", "rejected"])
  decision: "approved" | "rejected";

  @IsOptional()
  @IsString()
  note?: string;
}
