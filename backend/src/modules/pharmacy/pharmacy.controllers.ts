import { Body, Controller, Get, Param, Post, Patch, Put, UseGuards, Query, Header, Headers, ForbiddenException, ServiceUnavailableException, Optional, BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, Public } from '../../common/auth.guard';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, isProviderRole } from '../../common/enums';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { PharmacyOrderService } from './services/pharmacy-order.service';
import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
import { PharmacyInventoryExtService } from './services/pharmacy-inventory-ext.service';
import { PharmacySeedService } from './services/pharmacy-seed.service';
import { SmartSplitService } from './services/smart-split.service';
import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';
import { PharmacyChatService } from './services/pharmacy-chat.service';
import { PharmacyShortageService } from './services/pharmacy-shortage.service';
import { PharmacyOrdersProviderService } from './services/pharmacy-orders-provider.service';
import { PharmacyOfferService } from './services/pharmacy-offer.service';
import { PharmacyInsuranceDecisionService } from './services/pharmacy-insurance-decision.service';
import { PharmacyExpiryCommandService } from './services/pharmacy-expiry-command.service';
import { PaymentsService } from '../payments/payments.module';
import { CreateDto, UpdateDto, CancelDto, PaymentIntentDto, CancelRejectedInsuranceDto, SelectOfferDto, AcceptFinalQuoteDto, RegisterCodDto, AcceptInsuranceDto, ItemActionDto, OutDto, DeliveredDto, InsuranceDecisionDto, CancelDto3, SetTrackingDto, RestockDto, SampleOrderDto, PreviewOfferDto, DraftOfferDto, RejectDto, PostDto, ReportDto, CreateDto2, MarkShortageDto, RejectDto5, SetCodPolicyDto, PaymentRulesDto, PharmacyCodSettingDto } from './pharmacy.controllers.dto';

// =========================================================================
//  PATIENT ENDPOINTS (/api/v2/patient/pharmacy/*)
// =========================================================================
@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientPharmacyController {
  constructor(private orders: PharmacyOrderService, private offers: PharmacyOfferService, private insurance: PharmacyInsuranceDecisionService, private cardPayments: PaymentsService, @Optional() private allocations?: PharmacyAllocationService) {}
  // Order roots are state-changing: keys are mandatory (P0-01). The global
  // IdempotencyInterceptor then guarantees replay-safety (24h cache +
  // in-progress lock + body-hash mismatch guard). Mobile + web BFF already send keys.
  @Post('orders') @RequireIdempotency() create(@CurrentUser() u: any, @Body() b: CreateDto) { return this.orders.create(u, b); }
  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }
  @Get('orders/:id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.detail(u, id); }
  @Patch('orders/:id') @RequireIdempotency() update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateDto) { return this.orders.update(u, id, b); }
  @Post('orders/:id/submit') @RequireIdempotency() submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }
  @Post('orders/:id/cancel') @RequireIdempotency() cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: CancelDto) { return this.orders.cancel(u, id, b?.reason || ''); }
  @Post('orders/:id/insurance-rejection/cancel') cancelRejectedInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: CancelRejectedInsuranceDto, @Headers('idempotency-key') idemHeader?: string) { return this.insurance.cancelRejectedByPatient(u, id, b?.idempotency_key || idemHeader); }
  // A-2: ?include=closed also returns the expired, withdrawn and earlier offers, each with its offer_state.
  @Get('orders/:id/offers') listOffers(@CurrentUser() u: any, @Param('id') id: string, @Query('include') include?: string) { return this.offers.listForPatient(u, id, include === 'closed'); }
  @Post('orders/:id/offers/:offerId/select') selectOffer(@CurrentUser() u: any, @Param('id') id: string, @Param('offerId') offerId: string, @Body() b: SelectOfferDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.offers.selectByPatient(u, id, offerId, b?.idempotency_key || idemHeader, b?.coverage_mode);
  }

  @Post('orders/:id/final-quote/accept') acceptFinalQuote(@CurrentUser() u: any, @Param('id') id: string, @Body() b: AcceptFinalQuoteDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.orders.acceptFinalQuote(u, id, b?.quote_hash, b?.quote_revision, b?.idempotency_key || idemHeader);
  }

  @Post('orders/:id/cod/register') registerCod(@CurrentUser() u: any, @Param('id') id: string, @Body() b: RegisterCodDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.orders.registerCod(u, id, b?.idempotency_key || idemHeader);
  }

  @Get('orders/:id/payment-status') paymentStatus(@CurrentUser() u: any, @Param('id') id: string) {
    return this.orders.getPaymentStatus(u, id);
  }

  @Post('orders/:id/payment-retry') async retryPayment(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PaymentIntentDto, @Headers('idempotency-key') idemHeader?: string) {
    const key = b?.idempotency_key || idemHeader || '';
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) throw new BadRequestException('idempotency_key_required');
    await this.orders.prepareCardRetry(u, id, key);
    // Q104: the retry opens a real gateway checkout (Moyasar via PaymentsService), never a local
    // "sandbox" intent no gateway sees. An open checkout for this order is returned, not doubled.
    return this.cardPayments.createPaymentIntent(u, 'pharmacy', id, key, 'card');
  }

  @Post('orders/:id/insurance/:kind/accept') acceptInsurance(@CurrentUser() u: any, @Param('id') id: string, @Param('kind') kind: string, @Body() b: AcceptInsuranceDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.insurance.acceptByPatient(u, id, kind, b?.payment_method, b?.idempotency_key || idemHeader);
  }

  // P13-R2: the patient decides a proposed substitute per item (never automatic).
  @Post('allocations/:id/items/:itemId/accept-substitute') acceptSubstitute(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.allocations!.decideSubstitute(u, id, itemId, 'accepted');
  }
  @Post('allocations/:id/items/:itemId/reject-substitute') rejectSubstitute(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.allocations!.decideSubstitute(u, id, itemId, 'rejected');
  }
}

// =========================================================================
//  PROVIDER PHARMACY ENDPOINTS (/api/v2/provider/pharmacy/*)
// =========================================================================
@Controller('provider/pharmacy')
@Roles(UserRole.PHARMACY, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class ProviderPharmacyController {
  constructor(
    private allocs: PharmacyAllocationService,
    private inv: PharmacyInventoryExtService,
    private providerOrders: PharmacyOrdersProviderService,
    private insurance: PharmacyInsuranceDecisionService,
    @Optional() private offersSvc?: PharmacyOfferService,
  ) {}

  /** P3 "My offers": ?status=draft|sent|chosen|not_chosen|expired|cancelled */
  @Get('offers') myOffers(@CurrentUser() u: any, @Query('status') status?: string) {
    if (!isProviderRole(u?.role)) throw new ForbiddenException();
    return this.offersSvc!.listForPharmacy(u, status);
  }

  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {
    if (!isProviderRole(u?.role)) throw new ForbiddenException();
    return this.allocs.listForProvider(u, status);
  }
  @Get('allocations/:id') detail(@CurrentUser() u: any, @Param('id') id: string) {
    if (!isProviderRole(u?.role)) throw new ForbiddenException();
    return this.allocs.detail(u, id);
  }
  @Post('allocations/:id/items/:itemId') itemAction(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() b: ItemActionDto) {
    return this.allocs.itemAction(u, id, itemId, b);
  }
  @Post('allocations/:id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.confirm(u, id); }
  @Post('allocations/:id/preparing') preparing(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.preparing(u, id); }
  @Post('allocations/:id/ready') ready(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.ready(u, id); }
  @Post('allocations/:id/out-for-delivery') out(@CurrentUser() u: any, @Param('id') id: string, @Body() b: OutDto) { return this.allocs.outForDelivery(u, id, b); }
  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string, @Body() b: DeliveredDto) { return this.allocs.delivered(u, id, b); }
  @Post('allocations/:id/insurance') updateInsurance() { return this.allocs.updateInsurance(); }
  @Post('orders/:id/insurance-decision') insuranceDecision(@CurrentUser() u: any, @Param('id') id: string, @Body() b: InsuranceDecisionDto) { return this.insurance.decide(u, id, b); }
  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: CancelDto3) { return this.allocs.cancel(u, id, b?.reason || ''); }

  // Operational preference (immediate): optional inventory-balance tracking.
  @Get('inventory-tracking') tracking(@CurrentUser() u: any) { return this.allocs.getInventoryTracking(u); }
  @Put('inventory-tracking') setTracking(@CurrentUser() u: any, @Body() b: SetTrackingDto) { return this.allocs.setInventoryTracking(u, b); }

  // =========================================================================
  //  BLUEPRINT V1.2 ENDPOINTS (ORDERS)
  // =========================================================================
  // Legacy parent-order actions are intentionally disabled. They accepted client prices,
  // co-pays and state changes, bypassing the offer selection and payment/insurance gates.
  @Post('orders/:id/accept')
  acceptOrder() { throw new ServiceUnavailableException('legacy_order_acceptance_disabled_use_patient_selected_offer'); }

  @Post('orders/:id/submit-basket')
  submitBasket() { throw new ServiceUnavailableException('legacy_basket_submission_disabled_use_versioned_offer'); }

  @Post('orders/:id/insurance')
  evaluateInsurance() { throw new ServiceUnavailableException('legacy_insurance_evaluation_disabled_use_governed_insurance_decision'); }

  @Post('orders/:id/preparing')
  orderPreparing() { throw new ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }

  @Post('orders/:id/ready')
  orderReady() { throw new ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }

  @Post('orders/:id/dispatch')
  orderDispatch() { throw new ServiceUnavailableException('legacy_order_dispatch_disabled_delivery_proof_required'); }
}

// =========================================================================
//  PROVIDER INVENTORY EXTENDED (/api/v2/provider/inventory/*)
// =========================================================================
@Controller('provider/inventory')
@Roles(UserRole.PHARMACY, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class ProviderInventoryExtController {
  constructor(private svc: PharmacyInventoryExtService) {}
  @Get('search') search(@CurrentUser() u: any, @Query('q') q?: string, @Query('barcode') bc?: string) { return this.svc.search(u, q, bc); }
  @Post(':id/restock') restock(@CurrentUser() u: any, @Param('id') id: string, @Body() b: RestockDto) { return this.svc.restock(u, id, Number(b?.qty) || 0); }
  @Get('low-stock-alerts') alerts(@CurrentUser() u: any) { return this.svc.listLowStockAlerts(u); }
  @Post('low-stock-alerts/:id/ack') ack(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.acknowledgeAlert(u, id); }
}

// =========================================================================
//  ADMIN ENDPOINTS (/api/v2/admin/pharmacy/*)
// =========================================================================
@Controller('admin/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminPharmacyController {
  constructor(
    private seedSvc: PharmacySeedService,
    private split: SmartSplitService,
    private allocs: PharmacyAllocationService,
    private broadcast: PharmacyBroadcastService,
    @InjectConnection() private readonly conn: Connection,
  ) {}
  @Post('split/:orderId') async manualSplit(@Param('orderId') id: string) {
    // Backward-compat: if order is in broadcasting state, route to broadcast fallback.
    try { return await this.split.runForOrder(id); }
    catch (e: any) { if (String(e?.message || '').includes('order_not_splittable')) return this.broadcast.fallbackSplit(id); throw e; }
  }
  // Master spec: admin audit trail for provider unit-price overrides on offers.
  // P13-R3: CSV export of the same filtered history (the JSON list below stays).
  @Get('price-overrides/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="price-overrides.csv"')
  async priceOverridesExport(@Query() q: any): Promise<string> {
    const col = (this.allocs as any).orders.db.collection('pharmacy_price_override_audit');
    const filter: any = {};
    if (q?.order_id) filter.order_id = String(q.order_id);
    if (q?.offer_id) filter.offer_id = String(q.offer_id);
    if (q?.pharmacy_account_id) filter.pharmacy_account_id = String(q.pharmacy_account_id);
    if (q?.sku) filter.sku = String(q.sku);
    if (q?.from || q?.to) {
      filter.changed_at = {};
      if (q.from) filter.changed_at.$gte = new Date(String(q.from));
      if (q.to) filter.changed_at.$lte = new Date(String(q.to));
    }
    const limit = Math.min(5000, Math.max(1, Number(q?.limit) || 5000));
    const rows: any[] = await col.find(filter).sort({ changed_at: -1 }).limit(limit).toArray();
    const header = 'id,order_id,offer_id,offer_version,pharmacy_account_id,order_item_id,sku,name_ar,name_en,catalog_price,override_price,currency,reason,changed_by,changed_at';
    const cell = (v: any): string => {
      if (v === null || v === undefined) return '';
      let s = v instanceof Date ? v.toISOString() : String(v);
      // CSV injection: a pharmacist-typed text starting with = + - @ (or a tab / CR) would run as a formula when the
      // admin opens the file in a spreadsheet; prefix it with ' so it stays text. Numbers are written as numbers.
      if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r: any) => [
      r.id, r.order_id, r.offer_id, r.offer_version, r.pharmacy_account_id,
      r.order_item_id, r.sku, r.name_ar, r.name_en, r.catalog_price,
      r.override_price, r.currency, r.reason, r.changed_by,
      r.changed_at instanceof Date ? r.changed_at.toISOString() : r.changed_at,
    ].map(cell).join(','));
    return [header, ...lines].join('\n');
  }
  @Get('price-overrides') async priceOverrides(@Query() q: any) {
    const col = (this.allocs as any).orders.db.collection('pharmacy_price_override_audit');
    const filter: any = {};
    if (q?.order_id) filter.order_id = String(q.order_id);
    if (q?.offer_id) filter.offer_id = String(q.offer_id);
    if (q?.pharmacy_account_id) filter.pharmacy_account_id = String(q.pharmacy_account_id);
    if (q?.sku) filter.sku = String(q.sku);
    if (q?.from || q?.to) {
      filter.changed_at = {};
      if (q.from) filter.changed_at.$gte = new Date(String(q.from));
      if (q.to) filter.changed_at.$lte = new Date(String(q.to));
    }
    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q?.limit) || 25));
    const [items, total] = await Promise.all([
      col.find(filter).sort({ changed_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /** D-12: offers with a line above the catalogue price or a line not mapped to the catalogue. */
  @Get('price-review') async priceReview(@Query() q: any): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const col = this.conn.collection('pharmacy_price_reviews');
    const filter: any = { status: q?.status === 'closed' ? 'closed' : 'open' };
    if (typeof q?.order_id === 'string' && q.order_id) filter.order_id = { $eq: q.order_id };
    if (q?.reason === 'price_above_catalogue' || q?.reason === 'not_verified') filter['lines.reason'] = q.reason;
    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q?.limit) || 25));
    const [rows, total] = await Promise.all([
      col.find(filter, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    // The admin queue (medicines-catalog "items to review") shows which pharmacy priced each line.
    const ids = [...new Set(rows.map((r: any) => r.pharmacy_account_id).filter((v: unknown): v is string => typeof v === 'string' && v.length > 0))];
    const profiles: any[] = ids.length
      ? await this.conn.collection('provider_profiles')
        .find({ account_id: { $in: ids } }, { projection: { _id: 0, account_id: 1, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1, business_name: 1, legal_name: 1 } })
        .toArray()
      : [];
    const names = new Map(profiles.map((p) => {
      const registered = p.business_name || p.legal_name || null;
      const ar = p.display_name_ar || p.name_ar || registered;
      const en = p.display_name_en || p.name_en || registered;
      return [p.account_id, { pharmacy_name_ar: ar || en || null, pharmacy_name_en: en || ar || null }];
    }));
    // A `not_verified` line either matches no catalogue item (the admin can create one from it) or matches an item
    // that has no reference price yet (sfda_price): say which, so the queue offers "create" only for the first.
    const lineKeys = rows.flatMap((r: any) => (Array.isArray(r.lines) ? r.lines : []).flatMap((l: any) => [l.medicine_id, l.sku]))
      .filter((v: unknown) => (typeof v === 'string' && v.length > 0) || typeof v === 'number').map((v: unknown) => String(v));
    const keys = [...new Set(lineKeys)];
    const meds: any[] = keys.length
      ? await this.conn.collection('medicines')
        .find({ is_deleted: { $ne: true }, $or: [{ id: { $in: keys } }, { sku: { $in: [...keys, ...keys.filter((k) => /^\d+$/.test(k)).map(Number)] } }] }, { projection: { _id: 0, id: 1, sku: 1 } })
        .toArray()
      : [];
    const byKey = new Map<string, string>();
    for (const m of meds) {
      byKey.set(String(m.id), m.id);
      if (m.sku !== undefined && m.sku !== null) byKey.set(String(m.sku), m.id);
    }
    const items = rows.map((r: any) => ({
      ...r,
      ...(names.get(r.pharmacy_account_id) ?? { pharmacy_name_ar: null, pharmacy_name_en: null }),
      lines: (Array.isArray(r.lines) ? r.lines : []).map((l: any) => ({
        ...l,
        catalogue_item_id: (l.medicine_id && byKey.get(String(l.medicine_id))) || (l.sku !== null && l.sku !== undefined ? byKey.get(String(l.sku)) : undefined) || null,
      })),
    }));
    return { items, total, page, limit };
  }
  /** D-12: the admin closes a reviewed row (catalogue item created or price checked); a later change to the offer reopens it. */
  @Post('price-review/:id/close') async closePriceReview(@Param('id') id: string, @CurrentUser('id') by: string): Promise<{ ok: true; id: string; status: 'closed' }> {
    const res = await this.conn.collection('pharmacy_price_reviews').updateOne(
      { id: { $eq: String(id) }, status: 'open' },
      { $set: { status: 'closed', closed_by: by, closed_at: new Date(), updatedAt: new Date() } },
    );
    if (!res.matchedCount) throw new NotFoundException('price_review_not_found');
    return { ok: true, id, status: 'closed' };
  }
  @Post('expire-stale-allocations') expireStale() { return this.allocs.expireStale(); }
}

/**
 * F17: demo seeders live ONLY in explicit test mode. This controller is
 * registered solely when NODE_ENV==='test' && ALLOW_TEST_SEED==='true', so
 * in every other environment the routes do not exist (404). The runtime
 * assert stays as defense-in-depth.
 */
@Controller('admin/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminPharmacySeedController {
  constructor(private seedSvc: PharmacySeedService) {}
  private assertTestSeedAllowed() {
    if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
      throw new ServiceUnavailableException('test_seed_disabled');
    }
  }

  @Post('seed') seed(@CurrentUser() u: any) { this.assertTestSeedAllowed(); return this.seedSvc.seed(u); }
  @Post('seed/sample-order') sampleOrder(@CurrentUser() u: any, @Body() b: SampleOrderDto) { this.assertTestSeedAllowed(); return this.seedSvc.seedSampleOrder(b?.patient_account_id || u.id); }
}

// =========================================================================
//  Phase 2A-rework: BROADCAST + CHAT + SHORTAGE controllers
// =========================================================================
@Controller('provider/pharmacy/broadcasts')
@Roles(UserRole.PHARMACY, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class ProviderBroadcastController {
  constructor(private bc: PharmacyBroadcastService, private offers: PharmacyOfferService) {}
  @Get() list(@CurrentUser() u: any) { return this.bc.listForPharmacy(u); }
  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.bc.detail(u, id); }
  @Post(':orderId/offers/preview') previewOffer(@CurrentUser() u: any, @Param('orderId') orderId: string, @Body() b: PreviewOfferDto) { return this.offers.previewQuote(u, orderId, b); }
  @Post(':orderId/offers/draft') draftOffer(@CurrentUser() u: any, @Param('orderId') orderId: string, @Body() b: DraftOfferDto) { return this.offers.upsertDraft(u, orderId, b); }
  @Post(':orderId/offers/:offerId/submit') submitOffer(@CurrentUser() u: any, @Param('orderId') orderId: string, @Param('offerId') offerId: string) { return this.offers.submitDraft(u, orderId, offerId); }
  // Kept only as explicit fail-closed compatibility routes. They may never reserve stock or allocate before patient selection.
  @Post(':orderId/i-have-all') haveAll() { throw new ServiceUnavailableException('legacy_broadcast_acceptance_disabled_use_offer_draft'); }
  @Post(':orderId/i-have-partial') havePartial() { throw new ServiceUnavailableException('legacy_broadcast_acceptance_disabled_use_offer_draft'); }
  @Post(':orderId/reject') reject(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: RejectDto) { return this.bc.respondReject(u, oid, b); }
}

/** Platform fulfillment policies (admin config-portal). The COD policy gates preparing cash orders. */
@Controller('admin/pharmacy/fulfillment-policies')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class AdminFulfillmentPolicyController {
  constructor(@InjectConnection() private readonly conn: Connection) {}
  private get col() { return this.conn.collection('pharmacy_fulfillment_policies'); }
  @Get() list(): Promise<any[]> { return this.col.find({ provider_account_id: null }, { projection: { _id: 0 } }).toArray(); }
  @Put('cod') async setCod(@CurrentUser() u: any, @Body() b: SetCodPolicyDto): Promise<any> {
    const now = new Date();
    await this.col.updateOne(
      { id: 'platform-cod' },
      { $set: { active: b.active === true, allow_preparation: b.active === true, updated_by: u?.id, updatedAt: now },
        $setOnInsert: { id: 'platform-cod', payment_method: 'cod', provider_account_id: null, createdAt: now } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({ id: uuidv4(), actor_id: u?.id, actor_role: 'admin', action: 'pharmacy.cod_policy_set', after: { active: b.active === true }, createdAt: now });
    return this.col.findOne({ id: 'platform-cod' }, { projection: { _id: 0 } });
  }
}

@Controller('admin/pharmacy/broadcasts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminBroadcastController {
  constructor(private bc: PharmacyBroadcastService, private readonly expiry: PharmacyExpiryCommandService) {}
  /** Admin monitor list (broadcast-monitor.tsx). */
  @Get()
  async list(@Query('limit') limit?: string) {
    return this.bc.adminList(Math.min(Math.max(Number(limit) || 50, 1), 200));
  }
  @Post(':orderId/advance') advance() { throw new ServiceUnavailableException('manual_broadcast_advance_disabled_use_expiry_command'); }
  @Post(':orderId/fallback-split') fallback(@Param('orderId') id: string) { return this.bc.fallbackSplit(id); }
  /** Explicit privileged command; no timer, cron, queue worker, or caller-supplied clock. */
  @Post('expire-due') expireDue(@Query('offer_cursor') offerCursor?: string, @Query('broadcast_cursor') broadcastCursor?: string, @Query('limit') limit?: string) {
    return this.expiry.expireDuePharmacyOffers(new Date(), { offer_id: offerCursor || undefined, broadcast_id: broadcastCursor || undefined }, limit ? Number(limit) : undefined);
  }
  @Post('expire-stale') expireStale() { throw new ServiceUnavailableException('legacy_expiry_sweep_disabled_use_expire_due_command'); }
}

@Controller('admin/pharmacy/orders')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminPharmacyInsuranceController {
  @Post(':orderId/insurance-decision')
  decide() { throw new ServiceUnavailableException('admin_insurance_decision_disabled_selected_pharmacy_required'); }
}

@Controller('pharmacy/chat')
@UseGuards(JwtAuthGuard)
export class PharmacyChatController {
  constructor(private chat: PharmacyChatService) {}
  @Get('threads') list(@CurrentUser() u: any, @Query('order_id') oid?: string) { return this.chat.listThreads(u, oid); }
  @Get('threads/:id/messages') msgs(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.listMessages(u, id); }
  // Both sides of the substitute negotiation write; the service checks the caller is the thread's patient or pharmacy (needs-review issue 517).
  @Roles(UserRole.PHARMACY, UserRole.PATIENT, UserRole.ADMIN)
  @Post('threads/:id/messages') post(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PostDto) { return this.chat.postMessage(u, id, b); }
  // The patient decides on a substitute (the service refuses anyone but the thread's patient).
  @Roles(UserRole.PATIENT)
  @Post('threads/:id/accept-substitute/:msgId') accept(@CurrentUser() u: any, @Param('id') id: string, @Param('msgId') mid: string) { return this.chat.acceptSubstitute(u, id, mid); }
  @Roles(UserRole.PATIENT)
  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
  @Roles(UserRole.PATIENT)
  @Post('threads/:id/remove-item') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'removed'); }
}

@Controller('admin/pharmacy/chat')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminPharmacyChatController {
  constructor(private chat: PharmacyChatService) {}
  @Post('sweep-auto-close') sweep() { return this.chat.sweepAutoClose(); }
}

@Controller('provider/pharmacy/shortage-flags')
@UseGuards(JwtAuthGuard)
export class ProviderShortageController {
  constructor(private svc: PharmacyShortageService) {}
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  @Post() report(@CurrentUser() u: any, @Body() b: ReportDto) { return this.svc.reportByPharmacy(u, b); }
  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
}

@Controller('admin/pharmacy/shortage-flags')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminShortageController {
  constructor(private svc: PharmacyShortageService) {}
  @Post() create(@CurrentUser() u: any, @Body() b: CreateDto2) { return this.svc.createByAdmin(u, b); }
  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
  @Get('dashboard') getDashboard(@CurrentUser() u: any) { return this.svc.getShortageDashboard(u); }
  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: MarkShortageDto) { return this.svc.adminMarkShortage(u, medicineId, b); }
  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.approve(u, id); }
  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: RejectDto5) { return this.svc.reject(u, id, b?.reason); }
  @Post(':id/resolve') resolve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.resolve(u, id); }
}

@Controller('patient/pharmacy/shortage-flags')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientShortageController {
  constructor(private svc: PharmacyShortageService) {}
  @Get('lookup') lookup(@Query('sku') sku?: string, @Query('generic_name') gn?: string) { return this.svc.lookupForPatient(sku, gn); }
}


/** D-25 (owner decision 25): the cash-on-delivery cap, public for the apps, set by an admin. */
@Controller()
export class PaymentRulesController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get('payment-rules')
  async rules() {
    const doc: any = await this.conn.collection('system_configs').findOne({ key: 'payment_rules' });
    return { pharmacy_cod_max_sar: Number(doc?.value?.pharmacy_cod_max_sar) > 0 ? Number(doc.value.pharmacy_cod_max_sar) : null };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/payment-rules')
  async setRules(@CurrentUser() u: any, @Body() b: PaymentRulesDto) {
    const cap = Number(b?.pharmacy_cod_max_sar);
    if (!(cap > 0)) throw new BadRequestException('pharmacy_cod_max_sar_must_be_positive');
    await this.conn.collection('system_configs').updateOne(
      { key: 'payment_rules' },
      { $set: { 'value.pharmacy_cod_max_sar': cap, updated_by: u?.id ?? null, updatedAt: new Date() } },
      { upsert: true },
    );
    return { pharmacy_cod_max_sar: cap };
  }

  /** The pharmacy switches its own cash on delivery (absent = allowed). */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PHARMACY)
  @Put('provider/pharmacy/cod')
  async setPharmacyCod(@CurrentUser() u: any, @Body() b: PharmacyCodSettingDto) {
    if (!u?.id) throw new ForbiddenException('provider_identity_required');
    await this.conn.collection('provider_settings').updateOne(
      { provider_id: u.id },
      { $set: { cod_enabled: b.enabled === true, updatedAt: new Date() } },
      { upsert: true },
    );
    return { cod_enabled: b.enabled === true };
  }
}
