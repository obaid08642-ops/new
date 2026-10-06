import {
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ScoreUserDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  userId: string;
}

export class ScoreOrderDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  orderId: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class RiskActionDto {
  @IsDefined()
  @IsIn(['acknowledge', 'dismiss', 'escalate'])
  action: 'acknowledge' | 'dismiss' | 'escalate';

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

export class RiskQueueQueryDto {
  @IsOptional()
  @IsIn(['pending', 'flagged', 'dismissed'])
  status?: 'pending' | 'flagged' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  flagType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
