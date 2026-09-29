import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AiContentReviewService } from './ai-content-review.service';

/**
 * Phase 10 medical safety: the human side of the AI content review queue.
 *
 * Admin-only, matching the other AI control endpoints. A reviewer sees exactly
 * what the patient would have seen, plus the prompt summary, care level and
 * whether it already went out (emergency triage is published immediately and
 * flagged as such rather than silently appearing in the pending list).
 */
@Controller('ai/content-review')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AiContentReviewController {
  constructor(private readonly review: AiContentReviewService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.review.list(status, Number(limit) || 50);
  }

  @Post(':id/decision')
  decide(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { decision?: string; note?: string },
  ) {
    const decision = body?.decision === 'approved' ? 'approved' : 'rejected';
    return this.review.review(id, user?.id, decision, body?.note);
  }
}
