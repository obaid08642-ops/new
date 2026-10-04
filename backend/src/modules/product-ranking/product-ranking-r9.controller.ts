import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DynamicRankingR9Service, R9Mode } from './product-ranking-r9.service';

const MODES: R9Mode[] = ['smart', 'trending', 'bestseller', 'most_viewed'];

/**
 * 13.R9 — ONE read API for dynamic ranking.
 * GET /medicines/ranking-r9?mode=smart&category=all&limit=20&offset=0
 * Returns ranked product ids for the requested mode + category scope.
 */
@ApiTags('Product Ranking (R9)')
@Controller('medicines/ranking-r9')
export class ProductRankingR9Controller {
  constructor(private readonly r9: DynamicRankingR9Service) {}

  @Get()
  @ApiOperation({ summary: 'R9: ranked product ids by mode + category scope (windows + anti-abuse applied at ingest)' })
  async getRanked(
    @Query('mode') mode?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const safeMode: R9Mode = MODES.includes(mode as R9Mode) ? (mode as R9Mode) : 'smart';
    const result = await this.r9.getRankedIds({
      mode: safeMode,
      category: category || 'all',
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
    return { status: 'success', ...result };
  }
}
