import { IsOptional } from 'class-validator';

export class FcaDto {
  @IsOptional()
  reason?: any;

}

export class FcoapptDto {
  @IsOptional()
  reason?: any;

}

export class FraDto {
  @IsOptional()
  new_time?: any;

  @IsOptional()
  reason?: any;

}

export class FcoDto {
  @IsOptional()
  reason?: any;

}

export class FkcoDto {
  @IsOptional()
  reason?: any;

}

export class FrrDto {
  @IsOptional()
  pharmacy_id?: any;

  @IsOptional()
  reason?: any;

}

export class FclDto {
  @IsOptional()
  reason?: any;

}

export class FkclDto {
  @IsOptional()
  reason?: any;

}

export class OilDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  reason?: any;

}

export class FcrDto {
  @IsOptional()
  reason?: any;

}

export class FkcrDto {
  @IsOptional()
  reason?: any;

}

export class OirDto {
  @IsOptional()
  status?: any;

  @IsOptional()
  reason?: any;

}

export class SuspDto {
  @IsOptional()
  reason?: any;

}
