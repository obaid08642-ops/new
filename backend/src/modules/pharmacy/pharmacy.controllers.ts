import { Body, Controller, Get, Param, Post, Patch, Put, UseGuards, Query, Headers, ForbiddenException, ServiceUnavailableException, Res } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
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
import { PharmacyPaymentEvidenceService } from './services/pharmacy-payment-evidence.service';
import { CreateDto, UpdateDto, CancelDto, CancelRejectedInsuranceDto, SelectOfferDto, AcceptFinalQuoteDto, RegisterCodDto, AcceptInsuranceDto, ItemActionDto, OutDto, DeliveredDto, InsuranceDecisionDto, CancelDto3, SetTrackingDto, RestockDto, SampleOrderDto, PreviewOfferDto, DraftOfferDto, RejectDto, PostDto, ReportDto, CreateDto2, MarkShortageDto, RejectDto5, SetCodPolicyDto } from './pharmacy.controllers.dto';

// =========================================================================
//  PATIENT ENDPOINTS (/api/v2/patient/pharmacy/*)
// =========================================================================
@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientPharmacyController {
  constructor(private orders: PharmacyOrderService, private offers: PharmacyOfferService, private insurance: PharmacyInsuranceDecisionService) {}
  // Order roots are state-changing: keys are mandatory (P0-01). The global
  // IdempotencyInterceptor then guarantees replay-safety (24h cache +
  // in-progress lock + body-hash mismatch guard). Mobile + web BFF already send keys.
  @Post('orders') @RequireIdempotency() create(@CurrentUser() u: any, @Body() b: CreateDto) { return this.orders.create(u, b); }
  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }
  @Get('orders/:id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.detail(u, id); }
  @Patch('orders/:id') @RequireIdempotency() update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateDto) { return this.orders.update(u, id, b); }
  @Post('orders/:id/submit') @RequireIdempotency() submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }
  @Post('orders/:id/cancel') @RequireIdempotency() cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: CancelDto) { return this.orders.cancel(u, id, b?.reason || ''); }
  @Post('orders/:id/insurance-rejection/cancel') cancelRejectedInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: CancelRejectedInsuranceDto) { return this.insurance.cancelRejectedByPatient(u, id, b?.idempotency_key); }
  @Get('orders/:id/offers') listOffers(@CurrentUser() u: any, @Param('id') id: string) { return this.offers.listForPatient(u, id); }
  @Post('orders/:id/offers/:offerId/select') selectOffer(@CurrentUser() u: any, @Param('id') id: string, @Param('offerId') offerId: string, @Body() b: SelectOfferDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.offers.selectByPatient(u, id, offerId, b?.idempotency_key || idemHeader, b?.coverage_mode);
  }

  @Post('orders/:id/final-quote/accept') acceptFinalQuote(@CurrentUser() u: any, @Param('id') id: string, @Body() b: AcceptFinalQuoteDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.orders.acceptFinalQuote(u, id, b?.quote_hash, b?.quote_revision, b?.idempotency_key || idemHeader);
  }

  @Post('orders/:id/cod/register') registerCod(@CurrentUser() u: any, @Param('id') id: string, @Body() b: RegisterCodDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.orders.registerCod(u, id, b?.idempotency_key || idemHeader);
  }

  @Post('orders/:id/insurance/:kind/accept') acceptInsurance(@CurrentUser() u: any, @Param('id') id: string, @Param('kind') kind: string, @Body() b: AcceptInsuranceDto, @Headers('idempotency-key') idemHeader?: string) {
    return this.insurance.acceptByPatient(u, id, kind, b?.payment_method, b?.idempotency_key || idemHeader);
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
  ) {}

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
  @Post('orders/:id/preparing')
  orderPreparing() { throw new ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }

  @Post('orders/:id/ready')
  orderReady() { throw new ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }

  // R4: accept/submit-basket/insurance/dispatch stubs removed (dup of pharmacy_ops).
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
  ) {}
  @Post('split/:orderId') async manualSplit(@Param('orderId') id: string) {
    // Backward-compat: if order is in broadcasting state, route to broadcast fallback.
    try { return await this.split.runForOrder(id); }
    catch (e: any) { if (String(e?.message || '').includes('order_not_splittable')) return this.broadcast.fallbackSplit(id); throw e; }
  }
  // Master spec: admin audit trail for provider unit-price overrides on offers.
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
  // R3: CSV export of the SAME audit trail (same filters, no paging cap games —
  // hard cap 5000 rows). Lives in this controller so no new controller +
  // registration is needed. BOM first so Excel opens Arabic correctly; every
  // cell quoted with inner quotes doubled (RFC 4180).
  @Get('price-overrides.csv') async priceOverridesCsv(@Query() q: any, @Res() res: any) {
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
    const rows: any[] = await col.find(filter).sort({ changed_at: -1 }).limit(5000).toArray();
    const cols = ['changed_at', 'pharmacy_account_id', 'order_id', 'offer_id', 'sku', 'catalog_price', 'override_price', 'reason', 'changed_by'];
    // CSV injection: a cell starting with = + - @ tab or CR runs as a formula in Excel;
    // prefix it with an apostrophe (pharmacy-entered reasons reach this file).
    const esc = (v: any) => {
      const raw = String(v ?? '');
      const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const lines = [cols.join(',')];
    for (const r of rows) {
      lines.push(cols.map((c) => {
        let v: any = (r as any)[c];
        if (c === 'changed_at' && v) v = new Date(v).toISOString();
        return esc(v);
      }).join(','));
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="price-overrides-${stamp}.csv"`);
    return res.send('\uFEFF' + lines.join('\r\n'));
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
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  @Post('threads/:id/messages') post(@CurrentUser() u: any, @Param('id') id: string, @Body() b: PostDto) { return this.chat.postMessage(u, id, b); }
  // R2: patients decide on substitution proposals for their own orders.
  // The service enforces t.patient_account_id === user.id, so opening the
  // role is safe — without PATIENT here every accept/reject 403s at the guard
  // before ownership is even checked, and the R2 flow cannot complete.
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.PATIENT)
  @Post('threads/:id/accept-substitute/:msgId') accept(@CurrentUser() u: any, @Param('id') id: string, @Param('msgId') mid: string) { return this.chat.acceptSubstitute(u, id, mid); }
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.PATIENT)
  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.PATIENT)
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
