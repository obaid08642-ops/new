import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  serviceType: string;

  @IsDefined()
  @IsString()
  reason: string;

  @IsDefined()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsBoolean()
  is_opened?: boolean;

  @IsOptional()
  @IsBoolean()
  is_used?: boolean;

  @IsOptional()
  @IsArray()
  items?: unknown[];

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  refundMethod?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachedDocs?: string[];
}

export class DecideDto {
  @IsDefined()
  @IsIn(["approved", "rejected"])
  decision: "approved" | "rejected";

  @IsOptional()
  @IsString()
  note?: string;
}

/** P7: the pharmacy's view on a return. */
export class ProviderRespondDto {
  @IsBoolean()
  agree!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
