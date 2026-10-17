import { Controller, Get, HttpCode, Module, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { SEARCH_LOCALES, SEARCH_SECTIONS, SearchLocale, SearchSection } from './search-documents';
import { SearchService } from './search.service';

import { Permission, RequirePermissions } from '../../common/permissions';
export class SearchQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn([...SEARCH_SECTIONS]) section?: SearchSection;
  @IsOptional() @IsIn([...SEARCH_LOCALES]) locale?: SearchLocale;
  @IsOptional() @IsString() @Matches(/^\d{1,2}$/) limit?: string;
}

export class SuggestQueryDto {
  @IsOptional() @IsString() @MaxLength(60) q?: string;
  @IsOptional() @IsIn([...SEARCH_LOCALES]) locale?: SearchLocale;
}

/** D-29: one search for every section (`section`), and the grouped home search (no section). */
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Public() @Get()
  search(@Query() dto: SearchQueryDto) {
    return this.svc.search(dto.q || '', { section: dto.section, locale: dto.locale, limit: dto.limit ? Number(dto.limit) : undefined });
  }

  @Public() @Get('suggest')
  suggest(@Query() dto: SuggestQueryDto) {
    return this.svc.suggest(dto.q || '', dto.locale);
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
