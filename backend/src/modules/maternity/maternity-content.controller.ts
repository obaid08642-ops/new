import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { MaternityService } from './maternity.service';
import { MaternityContentQueryDto } from './pregnancy-weeks.dto';
import { MaternityContent, PregnancyWeeksService } from './pregnancy-weeks.service';

/**
 * GET /api/v1/maternity/content (issues #849 / #861): the pregnancy week entry of the admin catalogue (null when the admin has
 * not filled or published it) and "Read this week" (published articles tagged with that week) for the reader's current week
 * from the maternity profile, or for `?week=` (1-42). The patient app hub and the website /maternity both read it.
 */
@UseGuards(JwtAuthGuard)
@Controller('maternity')
@SelfService()
export class MaternityContentController {
  constructor(private readonly maternity: MaternityService, private readonly weeks: PregnancyWeeksService) {}

  @Get('content')
  async getContent(@Req() req: { user?: { id?: unknown } }, @Query() query: MaternityContentQueryDto): Promise<MaternityContent> {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) throw new UnauthorizedException('authenticated_patient_required');
    if (query.week !== undefined) return this.weeks.contentFor(query.week);
    const profile = await this.maternity.getProfile(userId);
    const week = profile?.is_pregnant === true && typeof profile.current_week === 'number' ? profile.current_week : null;
    return this.weeks.contentFor(week);
  }
}
