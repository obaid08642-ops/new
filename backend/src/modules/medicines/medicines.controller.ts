import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards, Delete, Put } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('medicines')
@UseGuards(JwtAuthGuard)
export class MedicinesController {
  constructor(private svc: MedicinesService) {}

  @Public()
  @Get()
  list(
    @Query('search') search: string,
    @Query('q') q: string,
    @Query('category') category: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Headers('authorization') auth?: string,
  ) {
    const term = search || q; // 'q' is a legacy alias used by older clients
    const userId = this.optionalUserId(auth);
    // Cursor mode (O(1) deep browsing) takes precedence when ?cursor= is present
    if (cursor !== undefined) {
      return this.svc.cursorPage(term, category, cursor || undefined, parseInt(limit || '30'));
    }
    if (page !== undefined) {
      return this.svc.paginate(term, category, parseInt(page || '1'), parseInt(limit || '30'));
    }
    return this.svc.list(term, category, true, limit ? parseInt(limit) : undefined, userId);
  }

  /** Decode (not verify) JWT for analytics attribution — never a security gate. */
  private optionalUserId(auth?: string): string | undefined {
    try {
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return undefined;
      const payload: any = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      return payload?.sub || payload?.id;
    } catch { return undefined; }
  }

  @Public()
  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.svc.autocomplete(q);
  }

  @Public()
  @Post('lookup-barcode')
  lookupBarcode(@Body() body: { code: string }) {
    return this.svc.byBarcode(body?.code || '');
  }

  @Public()
  @Get('by-barcode/:code')
  byBarcode(@Param('code') code: string) {
    return this.svc.byBarcode(code);
  }

  @Public()
  @Get('categories')
  categoriesList() {
    return this.svc.categories();
  }

  @Public()
  @Get('filters')
  filters() {
    return this.svc.filters();
  }

  @Public()
  @Post('compare')
  compare(@Body() body: { ids: string[] }) {
    return this.svc.compare(body?.ids || []);
  }


  // ── "Potentially Unavailable" workflow — declared BEFORE ':id' wildcard ──

  /** Smart Cache: Top 50 hot medicines (daily cron, weighted 50/30/20) */
  @Public()
  @Get('hot')
  hot() {
    return this.svc.hot();
  }

  /** "Did you mean?" suggestion for a misspelled term */
  @Public()
  @Get('search/did-you-mean')
  didYouMean(@Query('q') q: string) {
    return this.svc.didYouMean(q || '');
  }

  /** Trending searches (7 days) — "trending now" row */
  @Public()
  @Get('search/trending')
  trending(@Query('limit') limit?: string) {
    return this.svc.trendingSearches(parseInt(limit || '10'));
  }

  /** Recent searches of the authenticated user */
  @Get('search/recent')
  recent(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.svc.recentSearches(user?.id, parseInt(limit || '10'));
  }

  /** Admin: manual hot-list regeneration */
  @Post('admin/hot/regenerate')
  @Roles(UserRole.ADMIN)
  regenerateHot() {
    return this.svc.generateHotMedicines();
  }

  /** Provider reports a shortage — badge stays hidden until admin approval */
  @Post(':id/report-shortage')
  reportShortage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { note?: string; quantity_available?: number }) {
    return this.svc.reportShortage(id, user, body || {});
  }

  /** Admin: list shortage reports */
  @Get('admin/shortage-reports')
  @Roles(UserRole.ADMIN)
  shortageReports(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listShortageReports(status || 'pending', parseInt(page || '1'), parseInt(limit || '20'));
  }

  /** Admin: approve → badge appears */
  @Post('admin/shortage-reports/:reportId/approve')
  @Roles(UserRole.ADMIN)
  approveShortage(@Param('reportId') reportId: string, @CurrentUser('id') by: string) {
    return this.svc.approveShortageReport(reportId, by);
  }

  /** Admin: reject → no badge */
  @Post('admin/shortage-reports/:reportId/reject')
  @Roles(UserRole.ADMIN)
  rejectShortage(@Param('reportId') reportId: string, @CurrentUser('id') by: string, @Body() body: { reason?: string }) {
    return this.svc.rejectShortageReport(reportId, by, body?.reason);
  }

  /** Admin: clear badge when stock normalizes */
  @Post('admin/catalog/:id/clear-shortage-badge')
  @Roles(UserRole.ADMIN)
  clearBadge(@Param('id') id: string, @CurrentUser('id') by: string) {
    return this.svc.clearShortageBadge(id, by);
  }

  /** Admin: set availability explicitly (none | availability_may_be_limited | discontinued) */
  @Post('admin/catalog/:id/availability')
  @Roles(UserRole.ADMIN)
  setAvailability(@Param('id') id: string, @CurrentUser('id') by: string, @Body() body: { status: string }) {
    return this.svc.setAvailability(id, by, body?.status);
  }

  /** Provider suggests a new image for a medicine (upload via /storage first) */
  // @Public(): unregistered visitors may suggest images too (guest reporter).
  @Public()
  @Post(':id/suggest-image')
  suggestImage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { storage_id?: string; image_url?: string; note?: string }) {
    return this.svc.suggestImage(id, user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Admin: list image suggestions */
  @Get('admin/image-suggestions')
  @Roles(UserRole.ADMIN)
  imageSuggestions(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listImageSuggestions(status || 'pending', parseInt(page || '1'), parseInt(limit || '20'));
  }

  /** Admin: approve → image goes live, old R2 image deleted */
  @Post('admin/image-suggestions/:suggestionId/approve')
  @Roles(UserRole.ADMIN)
  approveImage(@Param('suggestionId') suggestionId: string, @CurrentUser('id') by: string) {
    return this.svc.approveImageSuggestion(suggestionId, by);
  }

  /** Admin: reject image suggestion */
  @Post('admin/image-suggestions/:suggestionId/reject')
  @Roles(UserRole.ADMIN)
  rejectImage(@Param('suggestionId') suggestionId: string, @CurrentUser('id') by: string, @Body() body: { reason?: string }) {
    return this.svc.rejectImageSuggestion(suggestionId, by, body?.reason);
  }

  /** Anyone (incl. unregistered visitors): propose a change to a catalog item ("اقتراح تعديل") */
  @Public()
  @Post(':id/suggest-change')
  suggestChange(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.suggestChange(id, user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Anyone (incl. guests): propose a new catalog item that doesn't exist */
  @Public()
  @Post('suggest-new-item')
  suggestNewItem(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.suggestNewItem(user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Admin: unified change-request inbox (all types) */
  @Get('admin/change-requests')
  @Roles(UserRole.ADMIN)
  changeRequests(@Query('status') status?: string, @Query('type') type?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listChangeRequests(status || 'pending', type, parseInt(page || '1'), parseInt(limit || '20'));
  }

  /** Admin: approve → change applied to the live catalog immediately */
  @Post('admin/change-requests/:requestId/approve')
  @Roles(UserRole.ADMIN)
  approveChange(@Param('requestId') requestId: string, @CurrentUser('id') by: string, @Body() body?: { overrides?: any; approved_fields?: string[] }) {
    return this.svc.approveChangeRequest(requestId, by, body || {});
  }

  /** Admin: reject with reason */
  @Post('admin/change-requests/:requestId/reject')
  @Roles(UserRole.ADMIN)
  rejectChange(@Param('requestId') requestId: string, @CurrentUser('id') by: string, @Body() body: { reason?: string }) {
    return this.svc.rejectChangeRequest(requestId, by, body?.reason);
  }

  /** Admin: direct edit of any catalog item (search → edit → save) */
  @Patch('admin/catalog/:id')
  @Roles(UserRole.ADMIN)
  adminUpdateCatalog(@Param('id') id: string, @Body() body: any, @CurrentUser('id') by: string) {
    return this.svc.adminUpdateCatalog(id, body || {}, by);
  }

  /** Admin: catalog browser (search + paginate + category filter). */
  @Get('admin/catalog')
  @Roles(UserRole.ADMIN)
  adminCatalog(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_deleted') includeDeleted?: string,
  ) {
    return this.svc.adminListCatalog({
      q, category,
      page: parseInt(page || '1'), limit: parseInt(limit || '25'),
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  /** Admin: create a new catalog item. */
  @Post('admin/catalog')
  @Roles(UserRole.ADMIN)
  adminCreate(@Body() body: any, @CurrentUser('id') by: string) {
    return this.svc.adminCreateCatalog(body || {}, by);
  }

  /** Admin: soft-delete / restore a catalog item. */
  @Post('admin/catalog/:id/delete')
  @Roles(UserRole.ADMIN)
  adminDelete(@Param('id') id: string, @Body() body: { restore?: boolean }, @CurrentUser('id') by: string) {
    return this.svc.adminSetDeleted(id, !body?.restore, by);
  }

  /** Admin: sales & shortage analytics for the catalog screen. */
  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  adminReports() {
    return this.svc.adminCatalogReports();
  }

  /** Recently viewed products — "أكمل من حيث توقفت" */
  @Get('me/recently-viewed')
  recentlyViewed(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.svc.recentlyViewed(user?.id, parseInt(limit || '20'));
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Public()
  @Get(':id/details')
  details(@Param('id') id: string, @Headers('authorization') auth?: string, @Query('lang') lang?: string, @Headers('accept-language') acceptLang?: string) {
    const wanted = (lang || (acceptLang || '').split(',')[0] || '').toLowerCase().trim();
    const dbLang = wanted.startsWith('ar') ? 'ar' : wanted.startsWith('ur') ? 'ur' : wanted.startsWith('hi') ? 'hi' : wanted.startsWith('bn') ? 'bn' : (wanted.startsWith('tl') || wanted.startsWith('fil')) ? 'tl' : wanted.startsWith('en') ? 'en' : undefined;
    return this.svc.details(id, this.optionalUserId(auth), dbLang);
  }


  @Public()
  @Get(':id/alternatives')
  alts(@Param('id') id: string) {
    return this.svc.alternatives(id);
  }

  @Post('manual-entry')
  createManual(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createManualEntry(body, user.id, user.role);
  }

  @Get('admin/pending-review')
  @Roles(UserRole.ADMIN)
  pending() {
    return this.svc.pendingReview();
  }

  @Post('admin/catalog')
  @Roles(UserRole.ADMIN)
  createCatalog(@Body() body: any, @CurrentUser('id') by: string) {
    return this.svc.createCatalog(body, by);
  }

  @Delete('admin/catalog/:id')
  @Roles(UserRole.ADMIN)
  deleteCatalog(@Param('id') id: string) {
    return this.svc.deleteCatalog(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser('id') by: string) {
    return this.svc.approve(id, by);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser('id') by: string, @Body() body: { reason?: string }) {
    return this.svc.reject(id, by, body.reason || '');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  // ============ BULK IMPORT (CSV / JSON) ============
  @Post('admin/import-json')
  @Roles(UserRole.ADMIN)
  importJson(@Body() body: { rows: any[]; auto_approve?: boolean }, @CurrentUser('id') by: string) {
    return this.svc.bulkImport(body.rows || [], by, 'admin', !!body.auto_approve);
  }

  @Post('admin/import-csv')
  @Roles(UserRole.ADMIN)
  importCsv(@Body() body: { csv: string; auto_approve?: boolean }, @CurrentUser('id') by: string) {
    const rows = this.svc.parseCsv(body.csv || '');
    return this.svc.bulkImport(rows, by, 'admin', !!body.auto_approve);
  }
}
