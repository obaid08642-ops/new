import { IsArray, IsDefined, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * P22.12/Phase 1.1 — mystery-shopper checks.
 * Photo evidence travels as media IDs (strings); this module never touches
 * the media module — it only stores the IDs alongside the findings.
 */
export class CreateMysteryShopAssignmentDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  providerAccountId: string;

  /** Optional subset of the 8 standard checks; defaults to all. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  dueAt: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class SubmitMysteryShopFindingsDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  assignmentId: string;

  /** Map of check key → 'pass' | 'fail'. Must cover the assignment checklist. */
  @IsDefined()
  @IsObject()
  checks: Record<string, string>;

  /** Media IDs (photos) as evidence. Stored only — never fetched here. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoMediaIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}
