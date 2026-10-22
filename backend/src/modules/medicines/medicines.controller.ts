import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards, Delete, Put, GoneException, Res, Header, BadRequestException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { toPublicMedicine, toPublicProductCard } from './public-medicine';
import { PUBLIC_CATALOG_LOCALES } from './med-i18n';
import { queryInt } from '../../common/safe-query';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { SuggestChangeDto, SuggestNewItemDto, AdminUpdateCatalogDto, AdminCreateDto, LookupBarcodeDto, CompareDto, ReportShortageDto, RejectShortageDto, SetAvailabilityDto, SuggestImageDto, RejectImageDto, RejectChangeDto, AdminDeleteDto, ImportJsonDto, ImportCsvDto, ManualEntryDto, ApproveChangeDto, AdminApproveCatalogDto, AdminBulkApproveCatalogDto} from './medicines.dto';

@Controller('medicines')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class MedicinesController {
  constructor(private svc: MedicinesService) {}

  // Issue 1555: every @Public() route below answers with public fields only (toPublicMedicine / toPublicProductCard,
  // applied at the return so a cached row is cleaned too) of items that pass the public catalogue filter.
  @Public()
  @Get()
  async list(
    @Query('search') search: string,
    @Query('q') q: string,
    @Query('category') category: string,
    @Query('sort') sort?: string,
    @Query('pharmacy_id') pharmacyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Headers('authorization') auth?: string,
    @Query('forms') forms?: string,
    @Query('brands') brands?: string,
    @Query('rx_only') rxOnly?: string,
    @Query('min_price') minPrice?: string,
    @Query('max_price') maxPrice?: string,
  ) {
    // Query text reaches regexes and filters: drop control characters (MongoDB rejects a NUL in a
    // regex) and cap the length, so a malformed query is a normal search, never a 500.
    const clean = (v?: string) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 200) : undefined);
    search = clean(search) as string; q = clean(q) as string; category = clean(category) as string;
    sort = clean(sort); pharmacyId = clean(pharmacyId); cursor = cursor === undefined ? undefined : (clean(cursor) ?? '');
    const term = search || q; // 'q' is a legacy alias used by older clients
    const userId = this.optionalUserId(auth);
    // #450/#472: the filters and orders the pharmacy screens send are applied by the server (forms, brands,
    // prescription-only, price range; price and newest orders). The ranked paths below keep the default order.
    const list = (v?: string) => (clean(v) || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
    const price = (v?: string) => { const n = Number(clean(v)); return Number.isFinite(n) && n >= 0 ? n : undefined; };
    const filters = { forms: list(forms), brands: list(brands), rx_only: rxOnly === '1' || rxOnly === 'true', min_price: price(minPrice), max_price: price(maxPrice) };
    const ordered = sort === 'price_asc' || sort === 'price_desc' || sort === 'newest';
    if (ordered || filters.forms.length || filters.brands.length || filters.rx_only || filters.min_price !== undefined || filters.max_price !== undefined) {
      return toPublicMedicine(await this.svc.filtered(term, category, filters, ordered ? sort! : 'relevant', page === undefined ? undefined : queryInt(page, 1), queryInt(limit, 30)));
    }
    // Cursor mode (O(1) deep browsing) takes precedence when ?cursor= is present
    if (cursor !== undefined) {
      return toPublicMedicine(await this.svc.cursorPage(term, category, cursor || undefined, queryInt(limit, 30)));
    }
    if (page !== undefined) {
      // A public list: only the governed (approved, published) catalogue, as in list() below.
      return toPublicMedicine(await this.svc.paginate(term, category, queryInt(page, 1), queryInt(limit, 30), false, sort || 'smart_ranking', pharmacyId));
    }
    return toPublicMedicine(await this.svc.list(term, category, false, limit === undefined ? undefined : queryInt(limit, 30), userId, sort || 'smart_ranking', pharmacyId));
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
  async autocomplete(@Query('q') q: string) {
    return toPublicMedicine(await this.svc.autocomplete(q));
  }

  @Public()
  @Post('lookup-barcode')
  async lookupBarcode(@Body() body: LookupBarcodeDto) {
    return this.publicBarcodeAnswer(await this.svc.byBarcode(body?.code || ''));
  }

  @Public()
  @Get('by-barcode/:code')
  async byBarcode(@Param('code') code: string) {
    return this.publicBarcodeAnswer(await this.svc.byBarcode(code));
  }

  /** The barcode answer keeps its own `source` (catalog / fuzzy / none); only the medicine row is projected. */
  private publicBarcodeAnswer<T extends { medicine?: unknown }>(answer: T): T {
    return answer?.medicine ? { ...answer, medicine: toPublicMedicine(answer.medicine) } : answer;
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
  async compare(@Body() body: CompareDto) {
    return toPublicMedicine(await this.svc.compare(body?.ids || []));
  }


  // ── "Potentially Unavailable" workflow — declared BEFORE ':id' wildcard ──

  /** Smart Cache: Top 50 hot medicines (daily cron, weighted 50/30/20) */
  @Public()
  @Get('hot')
  async hot() {
    return toPublicMedicine(await this.svc.hot());
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
    return this.svc.trendingSearches(queryInt(limit, 10));
  }

  /** Recent searches of the authenticated user */
  @Get('search/recent')
  @Roles(UserRole.PATIENT) // Q78: the class default is ADMIN
  recent(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.svc.recentSearches(user?.id, queryInt(limit, 10));
  }

  /** Admin: manual hot-list regeneration */
  @RequirePermissions(Permission.OPS_CRONS_RUN)
  @Post('admin/hot/regenerate')
  @Roles(UserRole.ADMIN)
  regenerateHot() {
    return this.svc.generateHotMedicines();
  }

  /** Provider reports a shortage — badge stays hidden until admin approval */
  @Post(':id/report-shortage')
  @Roles(UserRole.PHARMACY) // Q78: the class default is ADMIN
  reportShortage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: ReportShortageDto) {
    return this.svc.reportShortage(id, user, body || {});
  }

  /** Admin: list shortage reports */
  @Get('admin/shortage-reports')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_READ)
  shortageReports(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listShortageReports(status || 'pending', queryInt(page, 1), queryInt(limit, 20));
  }

  /** Admin: approve → badge appears */
  @Post('admin/shortage-reports/:reportId/approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_SHORTAGE_DECIDE)
  approveShortage(@Param('reportId') reportId: string, @CurrentUser('id') by: string) {
    return this.svc.approveShortageReport(reportId, by);
  }

  /** Admin: reject → no badge */
  @Post('admin/shortage-reports/:reportId/reject')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_SHORTAGE_DECIDE)
  rejectShortage(@Param('reportId') reportId: string, @CurrentUser('id') by: string, @Body() body: RejectShortageDto) {
    return this.svc.rejectShortageReport(reportId, by, body?.reason);
  }

  /** Admin: clear badge when stock normalizes */
  @Post('admin/catalog/:id/clear-shortage-badge')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_SHORTAGE_DECIDE)
  clearBadge(@Param('id') id: string, @CurrentUser('id') by: string) {
    return this.svc.clearShortageBadge(id, by);
  }

  /** Admin: set availability explicitly (none | availability_may_be_limited | discontinued) */
  @Post('admin/catalog/:id/availability')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_SHORTAGE_DECIDE)
  setAvailability(@Param('id') id: string, @CurrentUser('id') by: string, @Body() body: SetAvailabilityDto) {
    return this.svc.setAvailability(id, by, body?.status, body?.reason);
  }

  /** Provider suggests a new image for a medicine (upload via /storage first) */
  // @Public(): unregistered visitors may suggest images too (guest reporter).
  @Public()
  @Post(':id/suggest-image')
  suggestImage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: SuggestImageDto) {
    return this.svc.suggestImage(id, user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Admin: list image suggestions */
  @Get('admin/image-suggestions')
  @Roles(UserRole.ADMIN)
  imageSuggestions(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listImageSuggestions(status || 'pending', queryInt(page, 1), queryInt(limit, 20));
  }

  /** Admin: approve → image goes live, old R2 image deleted */
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/image-suggestions/:suggestionId/approve')
  @Roles(UserRole.ADMIN)
  approveImage(@Param('suggestionId') suggestionId: string, @CurrentUser('id') by: string) {
    return this.svc.approveImageSuggestion(suggestionId, by);
  }

  /** Admin: reject image suggestion */
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/image-suggestions/:suggestionId/reject')
  @Roles(UserRole.ADMIN)
  rejectImage(@Param('suggestionId') suggestionId: string, @CurrentUser('id') by: string, @Body() body: RejectImageDto) {
    return this.svc.rejectImageSuggestion(suggestionId, by, body?.reason);
  }

  /** Anyone (incl. unregistered visitors): propose a change to a catalog item ("اقتراح تعديل") */
  @Public()
  @Post(':id/suggest-change')
  suggestChange(@Param('id') id: string, @CurrentUser() user: any, @Body() body: SuggestChangeDto) {
    return this.svc.suggestChange(id, user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Anyone (incl. guests): propose a new catalog item that doesn't exist */
  @Public()
  @Post('suggest-new-item')
  suggestNewItem(@CurrentUser() user: any, @Body() body: SuggestNewItemDto) {
    return this.svc.suggestNewItem(user || { id: 'guest', role: 'guest' }, body || {});
  }

  /** Admin: unified change-request inbox (all types) */
  @Get('admin/change-requests')
  @Roles(UserRole.ADMIN)
  changeRequests(@Query('status') status?: string, @Query('type') type?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listChangeRequests(status || 'pending', type, queryInt(page, 1), queryInt(limit, 20));
  }

  /** Admin: approve → change applied to the live catalog immediately */
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/change-requests/:requestId/approve')
  @Roles(UserRole.ADMIN)
  approveChange(@Param('requestId') requestId: string, @CurrentUser('id') by: string, @Body() body?: ApproveChangeDto) {
    return this.svc.approveChangeRequest(requestId, by, body || {});
  }

  /** Admin: reject with reason */
  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Post('admin/change-requests/:requestId/reject')
  @Roles(UserRole.ADMIN)
  rejectChange(@Param('requestId') requestId: string, @CurrentUser('id') by: string, @Body() body: RejectChangeDto) {
    return this.svc.rejectChangeRequest(requestId, by, body?.reason);
  }

  /** Admin: direct edit of any catalog item (search → edit → save) */
  @Patch('admin/catalog/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE, Permission.CATALOG_PRICE_WRITE)
  adminUpdateCatalog(@Param('id') id: string, @Body() body: AdminUpdateCatalogDto, @CurrentUser('id') by: string) {
    return this.svc.adminUpdateCatalog(id, body || {}, by);
  }

  /** Admin: catalog browser (search + paginate + category filter). */
  @Get('admin/catalog')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_READ)
  adminCatalog(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_deleted') includeDeleted?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.adminListCatalog({
      q, category, status,
      page: queryInt(page, 1), limit: queryInt(limit, 25),
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  /** Admin: create a new catalog item. */
  @Post('admin/catalog')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_CREATE)
  adminCreate(@Body() body: AdminCreateDto, @CurrentUser('id') by: string) {
    return this.svc.adminCreateCatalog(body || {}, by);
  }

  /** Admin: soft-delete / restore a catalog item. */
  @Post('admin/catalog/:id/delete')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_DELETE_RESTORE)
  adminDelete(@Param('id') id: string, @Body() body: AdminDeleteDto, @CurrentUser('id') by: string) {
    return this.svc.adminSetDeleted(id, !body?.restore, by);
  }

  /** P6.0: medical-review decision (approve surfaces the item publicly). */
  @Post('admin/catalog/:id/approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_APPROVE)
  adminApprove(@Param('id') id: string, @Body() body: AdminApproveCatalogDto, @CurrentUser('id') by: string) {
    return this.svc.adminApproveCatalog(id, body?.approve !== false, by);
  }

  /** P6.0: bulk medical-review decision (max 200 ids). */
  @Post('admin/catalog/bulk-approve')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_UPDATE)
  async adminBulkApprove(@Body() body: AdminBulkApproveCatalogDto, @CurrentUser('id') by: string) {
    const list = (Array.isArray(body?.ids) ? body.ids : []).filter((x) => typeof x === 'string' && x).slice(0, 200);
    if (!list.length) throw new BadRequestException('ids_required');
    const approve = body?.approve !== false;
    const results: any[] = [];
    for (const itemId of list) {
      try {
        await this.svc.adminApproveCatalog(itemId, approve, by);
        results.push({ id: itemId, ok: true });
      } catch (e: any) {
        results.push({ id: itemId, ok: false, error: e?.message || 'failed' });
      }
    }
    return { ok: true, approve, results };
  }

  /** Admin: immutable price history for governance and finance review. */
  @Get('admin/catalog/:id/price-history')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_READ)
  priceHistory(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string): Promise<{ data: any[]; total: number; page: number; pages: number }> {
    return this.svc.getPriceHistory(id, queryInt(page, 1), queryInt(limit, 50));
  }

  /** Admin: sales & shortage analytics for the catalog screen. */
  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  adminReports() {
    return this.svc.adminCatalogReports();
  }

  // ── Response Streaming for large catalog (Task 2.4) ──────────────────
  // NEW streaming endpoint — does NOT modify existing @Get() list endpoint.
  // Uses cursor streaming with batchSize 100 to avoid buffering the full catalog.
  @Public()
  @Get('stream')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header('Transfer-Encoding', 'chunked')
  async streamCatalog(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
    @Res() res?: any,
  ): Promise<void> {
    const raw = res?.raw || res;
    // Public endpoint: the same public catalogue gate as the search (approved and public only).
    const filter = this.svc.publicStreamFilter(search, category && category !== 'all' ? category : undefined);
    const svcAny: any = this.svc as any;
    try {
      raw.write('{"items":[');
      let first = true;
      // Use repository model cursor with batchSize 100
      const modelAny: any = svcAny.model;
      // model may be MedicineRepository wrapping Mongoose Model via .model
      const mongooseModel: any = modelAny?.model || modelAny;
      // Prefer repository find that returns a Mongoose Query with lean/batchSize/cursor
      let cursor: any;
      if (modelAny && typeof modelAny.find === 'function') {
        // Try repository path first (returns Query)
        const q: any = modelAny.find(filter);
        // q may already be a Query; apply lean/batchSize
        if (q && typeof q.lean === 'function') {
          cursor = q.lean().batchSize(100).cursor();
        } else {
          cursor = mongooseModel.find(filter).lean().batchSize(100).cursor();
        }
      } else {
        cursor = mongooseModel.find(filter).lean().batchSize(100).cursor();
      }
      for await (const doc of cursor) {
        if (!first) raw.write(',');
        raw.write(JSON.stringify(toPublicMedicine(doc)));
        first = false;
      }
      raw.write(']}');
      raw.end();
    } catch (e) {
      if (!raw.headersSent) raw.writeHead?.(500, { 'Content-Type': 'application/json' });
      try { raw.write(JSON.stringify({ error: (e as Error).message })); } catch {}
      raw.end();
    }
  }

  /** Recently viewed products — "أكمل من حيث توقفت" */
  @Get('me/recently-viewed')
  @Roles(UserRole.PATIENT) // Q78: the class default is ADMIN
  recentlyViewed(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.svc.recentlyViewed(user?.id, queryInt(limit, 20));
  }

  @Public()
  @Get(':id')
  async one(@Param('id') id: string) {
    return toPublicMedicine(await this.svc.getPublicById(id));
  }

  /**
   * How many pharmacies stock the item (owner, 2026-10-16): only for a signed-in patient, never on a public route.
   * The count comes from the live inventory, not from the cached field on the record.
   */
  @Get(':id/availability')
  @Roles(UserRole.PATIENT)
  async availability(@Param('id') id: string): Promise<{ pharmacies_count: number; in_stock: boolean }> {
    await this.svc.getPublicById(id);
    const stock = await this.svc.aggregateStock(id);
    return { pharmacies_count: stock.pharmacies_count, in_stock: stock.in_stock };
  }

  @Public()
  @Get(':id/details')
  async details(@Param('id') id: string, @Headers('authorization') auth?: string, @Query('lang') lang?: string, @Headers('accept-language') acceptLang?: string) {
    const wanted = (lang || (acceptLang || '').split(',')[0] || '').toLowerCase().trim();
    const dbLang = wanted.startsWith('ar') ? 'ar' : wanted.startsWith('ur') ? 'ur' : wanted.startsWith('hi') ? 'hi' : wanted.startsWith('bn') ? 'bn' : (wanted.startsWith('tl') || wanted.startsWith('fil')) ? 'tl' : wanted.startsWith('en') ? 'en' : undefined;
    return toPublicMedicine(await this.svc.details(id, this.optionalUserId(auth), dbLang));
  }


  @Public()
  @Get(':id/alternatives')
  async alts(@Param('id') id: string, @Query('locale') locale?: string) {
    // Issue 1555: the public product card of GET /public/products/search, in the asked locale (Arabic by default).
    const loc = (PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale || '') ? locale! : 'ar';
    const rows = await this.svc.alternatives(id);
    return (rows as Array<Record<string, unknown>>).map((m) => toPublicProductCard(m, loc));
  }

  /** 22.3: items bought with this one, never prescription or controlled items, each with its interaction warnings. */
  @Public()
  @Get(':id/frequently-bought-together')
  async boughtTogether(@Param('id') id: string, @Query('locale') locale?: string) {
    const loc = (PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale || '') ? locale! : 'ar';
    const rows = await this.svc.frequentlyBoughtTogether(id);
    return rows.map(({ med, warnings }) => ({ ...toPublicProductCard(med, loc), interaction_warnings: warnings }));
  }

  @RequirePermissions(Permission.CATALOG_CREATE)
  @Post('manual-entry')
  createManual(@Body() body: ManualEntryDto, @CurrentUser() user: any) {
    return this.svc.createManualEntry(body, user.id, user.role);
  }

  @Get('admin/pending-review')
  @Roles(UserRole.ADMIN)
  pendingLegacyDisabled(): never {
    throw new GoneException('legacy_medicine_review_disabled_use_change_requests_contract');
  }

  /** Legacy contracts are intentionally fail-closed; use the canonical handlers above. */
  @RequirePermissions(Permission.CATALOG_CREATE)
  @Post('admin/catalog-legacy-disabled')
  @Roles(UserRole.ADMIN)
  createCatalogLegacyDisabled(): never {
    throw new GoneException('legacy_catalog_create_disabled_use_canonical_contract');
  }

  @RequirePermissions(Permission.CATALOG_DELETE_RESTORE)
  @Delete('admin/catalog/:id/legacy-delete-disabled')
  @Roles(UserRole.ADMIN)
  deleteCatalogLegacyDisabled(): never {
    throw new GoneException('legacy_catalog_delete_disabled_use_soft_delete_restore_contract');
  }

  @RequirePermissions(Permission.CATALOG_APPROVE)
  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approveLegacyDisabled(): never {
    throw new GoneException('legacy_medicine_approve_disabled_use_change_requests_contract');
  }

  @RequirePermissions(Permission.CATALOG_APPROVE)
  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  rejectLegacyDisabled(): never {
    throw new GoneException('legacy_medicine_reject_disabled_use_change_requests_contract');
  }

  @RequirePermissions(Permission.CATALOG_UPDATE)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  updateLegacyDisabled(): never {
    throw new GoneException('legacy_medicine_update_disabled_use_admin_catalog_contract');
  }

  // ============ BULK IMPORT (CSV / JSON) ============
  @Post('admin/import-json')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_IMPORT)
  importJson(@Body() body: ImportJsonDto, @CurrentUser('id') by: string) {
    return this.svc.bulkImport(body.rows || [], by, 'admin', !!body.auto_approve);
  }

  @Post('admin/import-csv')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.CATALOG_IMPORT)
  importCsv(@Body() body: ImportCsvDto, @CurrentUser('id') by: string) {
    const rows = this.svc.parseCsv(body.csv || '');
    return this.svc.bulkImport(rows, by, 'admin', !!body.auto_approve);
  }
}


/** SEO/static fragment contract. The service enforces reviewed and indexable data. */
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(private svc: MedicinesService) {}

  @Public()
  @Get(':locale/:category.json')
  fragment(@Param('locale') locale: string, @Param('category') category: string) {
    return this.svc.publicCatalogFragment(locale, category);
  }
}
