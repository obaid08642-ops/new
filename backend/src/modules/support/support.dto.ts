import { IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category: string;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  priority?: any;

}

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  subject: string;

  @IsDefined()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  category: string;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  priority?: any;

}

export class ReplyDto {
  @IsOptional()
  message?: any;

}

export class AdminUpdateDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  assigned_to?: any;

}
