import { IsOptional, IsString } from 'class-validator';

export class FcaDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FcoapptDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FraDto {
  @IsOptional()
  new_time?: any;

  @IsOptional()
  @IsString()
  reason?: string;


}

export class FcoDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FkcoDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FrrDto {
  @IsOptional()
  pharmacy_id?: any;

  @IsOptional()
  @IsString()
  reason?: string;


}

export class FclDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FkclDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class OilDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  @IsString()
  reason?: string;


}

export class FcrDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class FkcrDto {
  @IsOptional()
  @IsString()
  reason?: string;


}

export class OirDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  @IsString()
  reason?: string;


}

export class SuspDto {
  @IsOptional()
  @IsString()
  reason?: string;


}
