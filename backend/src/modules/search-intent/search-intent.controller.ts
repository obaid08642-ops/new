import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { SearchIntentService, ExtractedSearchIntent } from './search-intent.service';
import { JwtAuthGuard, Roles, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('search/intent')
export class SearchIntentController {
  constructor(private readonly intentService: SearchIntentService) {}

  @Public()
  @Post()
  async extractIntent(
    @Body('query') query: string,
    @Body('locale') locale?: string,
    @Body('client_type') clientType?: string,
  ): Promise<ExtractedSearchIntent> {
    return this.intentService.extractIntent(query, locale || 'ar', clientType || 'web');
  }

  /** R75: consume query analytics — zero/low-result queries drive P9 synonym/ranking work. */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('analytics/top-queries')
  async topQueries(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.intentService.topQueries(
      Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 200),
      Math.min(Math.max(parseInt(days || '30', 10) || 30, 1), 90),
    );
  }
}
