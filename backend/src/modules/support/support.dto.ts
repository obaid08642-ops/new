import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}

export class CreateTicketDto {
  @IsDefined()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}

export class ReplyDto {
  @IsOptional()
  @IsString()
  message?: string;
}

export class AdminUpdateDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
