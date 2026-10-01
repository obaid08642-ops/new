import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body of `POST /ai/content-review/:id/decision`.
 *
 * This is a real DTO class rather than an inline object type on purpose: the
 * global ValidationPipe only validates class instances, so an inline
 * `{ decision?: string; note?: string }` parameter is passed through completely
 * unvalidated. That let any string reach the decision branch, where the old code
 * silently coerced everything that was not exactly "approved" into "rejected" —
 * so a typo, a missing field, or a stray value recorded a rejection against a
 * medical review item and nobody could tell the difference.
 */
export class AiContentReviewDecisionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
