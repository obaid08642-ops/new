import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/** D-34: the server-side backup scripts report a run (D-33 calls this). */
export class ReportBackupRunDto {
  @IsIn(['local', 'offsite', 'restore_test', 'catalogue_export', 'oplog', 'dr_drill'])
  kind!: string;

  @IsBoolean()
  ok!: boolean;

  @IsOptional()
  @IsNumber()
  size_bytes?: number;

  @IsDateString()
  finished_at!: string;

  /** 20.8: recovery point the oplog chain delivers (dr_drill) */
  @IsOptional()
  @IsNumber()
  rpo_seconds?: number;

  /** 20.8: wall time of the whole restore (dr_drill) */
  @IsOptional()
  @IsNumber()
  rto_seconds?: number;

  @IsOptional()
  @IsString()
  error?: string;
}

/** D-34: super_admin records today as a secret's rotation date. */
export class RecordRotationDto {
  @IsOptional()
  @IsString()
  owner?: string;
}

/** D-34: super_admin records an operational incident. */
export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

/** D-34: super_admin changes an incident's status. */
export class UpdateIncidentDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
