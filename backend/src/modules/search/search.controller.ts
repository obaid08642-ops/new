import { UserRateLimit, UserRateLimitGuard } from '../../common/user-rate-limit';
import { Controller, Get, HttpCode, Module, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { PublicCache } from '../../common/public-cache.decorator';
import { SEARCH_LOCALES, SEARCH_SECTIONS, SEARCH_TYPES, SearchLocale, SearchSection, SearchType } from './search-documents';
import { SearchService } from './search.service';
import { SEARCH_SORTS, SearchRefine } from './search-refine';

import { Permission, RequirePermissions } from '../../common/permissions';
export class SearchQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn([...SEARCH_SECTIONS]) section?: SearchSection;
  @IsOptional() @IsIn([...SEARCH_LOCALES]) locale?: SearchLocale;
  @IsOptional() @IsString() @Matches(/^\d{1,2}$/) limit?: string;
  @IsOptional() @IsIn([...SEARCH_SORTS]) sort?: SearchRefine['sort'];
  @IsOptional() @IsString() @Matches(/^\d{1,7}(\.\d{1,2})?$/) price_min?: string;
  @IsOptional() @IsString() @Matches(/^\d{1,7}(\.\d{1,2})?$/) price_max?: string;
  @IsOptional() @IsIn(['true']) on_sale?: string;
}

/** Owner spec (issue 1544): a suggestion may be reused for 5 minutes by the browser and for an hour at the edge. */
export const SUGGEST_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

const SUGGEST_TYPES_PATTERN = new RegExp(`^(${SEARCH_TYPES.join('|')})(,(${SEARCH_TYPES.join('|')}))*$`);

export class SuggestQueryDto {
  @IsOptional() @IsString() @MaxLength(60) q?: string;
  @IsOptional() @IsIn([...SEARCH_LOCALES]) locale?: SearchLocale;
  /** A service screen's own suggestions: the same sections as GET /search. Nothing = the home search (everything). */
  @IsOptional() @IsIn([...SEARCH_SECTIONS]) section?: SearchSection;
  /** Narrows to some types, comma separated (labs without scans: `lab_test,lab_package`; scans: `radiology`). */
  @IsOptional() @IsString() @MaxLength(80) @Matches(SUGGEST_TYPES_PATTERN) types?: string;
}

/** D-29: one search for every section (`section`), and the grouped home search (no section). */
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  // 16.12: search hits the search engine; an account (a visitor: an address) gets 120 searches and 600 suggestions a minute
  @Public() @Get()
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('search', 120, 60)
  search(@Query() dto: SearchQueryDto) {
    return this.svc.search(dto.q || '', { section: dto.section, locale: dto.locale, limit: dto.limit ? Number(dto.limit) : undefined,
      refine: { sort: dto.sort, price_min: dto.price_min !== undefined ? Number(dto.price_min) : undefined, price_max: dto.price_max !== undefined ? Number(dto.price_max) : undefined, on_sale: dto.on_sale === 'true' } });
  }

  /**
   * Anonymous answers are shared at the edge for an hour and purged by the `search` tag when the catalogue changes
   * (SearchService.schedulePurge). A signed-in request gets `private, no-store` (CacheControlInterceptor).
   */
  @Public()
  @PublicCache(3600, ['search'], { cacheControl: SUGGEST_CACHE_CONTROL })
  @Get('suggest')
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('search_suggest', 600, 60)
  suggest(@Query() dto: SuggestQueryDto) {
    return this.svc.suggest(dto.q || '', dto.locale, { section: dto.section, types: dto.types ? (dto.types.split(',') as SearchType[]) : undefined });
  }
}

@Controller('admin/search')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class SearchAdminController {
  constructor(private readonly svc: SearchService) {}

  /** Rebuilds the search index from MongoDB (the source of truth). */
  @RequirePermissions(Permission.OPS_CRONS_RUN)
  @Post('reindex') @HttpCode(200)
  reindex() {
    return this.svc.rebuild();
  }
}

@Module({
  controllers: [SearchController, SearchAdminController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
