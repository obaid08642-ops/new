import { IsDefined, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordComplaintDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  providerAccountId: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  reporterUserId: string;

  @IsDefined()
  @IsIn(['service', 'behavior', 'billing', 'no_show', 'hygiene', 'other'])
  category: 'service' | 'behavior' | 'billing' | 'no_show' | 'hygiene' | 'other';

  @IsDefined()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  details: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderId?: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class ResolveComplaintDto {
  @IsDefined()
  @IsIn(['resolved', 'rejected'])
  outcome: 'resolved' | 'rejected';

  @IsDefined()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}
