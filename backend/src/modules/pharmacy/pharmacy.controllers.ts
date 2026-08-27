import { Body, Controller, Get, Param, Post, Patch, UseGuards, UseInterceptors, Query, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
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
import { isProviderRole } from '../../common/enums';
import { IdempotencyInterceptor, RequireIdempotency } from '../../common/idempotency.interceptor';
import { AcceptPharmacyFinalQuoteDto, SelectPharmacyOfferDto, SubmitPharmacyOfferDto } from './dto/pharmacy-offer.dto';

// =========================================================================
//  PATIENT ENDPOINTS (/api/v2/patient/pharmacy/*)
// =========================================================================
@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientPharmacyController {
  constructor(private orders: PharmacyOrderService, private offers: PharmacyOfferService) {}
  @Post('orders') create(@CurrentUser() u: any, @Body() b: any) { return this.orders.create(u, b); }
  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }
  @Get('orders/:id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.detail(u, id); }
  @Patch('orders/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.update(u, id, b); }
  @Post('orders/:id/submit') submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }
  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }
  @Get('orders/:id/offers') listOffers(@CurrentUser() u: any, @Param('id') id: string) { return this.offers.listPatientOffers(u, id); }
  @Post('orders/:id/offers/:offerId/select')
  @UseInterceptors(IdempotencyInterceptor)
  @RequireIdempotency()
  selectOffer(@CurrentUser() u: any, @Param('id') id: string, @Param('offerId') offerId: string, @Body() b: SelectPharmacyOfferDto) { return this.offers.selectOffer(u, id, offerId, b.coverage_mode); }
  @Post('orders/:id/final-quote/accept')
  @UseInterceptors(IdempotencyInterceptor)
  @RequireIdempotency()
  acceptFinalQuote(@CurrentUser() u: any, @Param('id') id: string, @Body() b: AcceptPharmacyFinalQuoteDto) { return this.offers.acceptFinalQuote(u, id, b.quote_hash, b.quote_revision); }
}

// =========================================================================
//  PROVIDER PHARMACY ENDPOINTS (/api/v2/provider/pharmacy/*)
// =========================================================================
@Controller('provider/pharmacy')
@UseGuards(JwtAuthGuard)
export class ProviderPharmacyController {
  constructor(
    private allocs: PharmacyAllocationService,
    private inv: PharmacyInventoryExtService,
    private providerOrders: PharmacyOrdersProviderService,
  ) {}

  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {
    if (!isProviderRole(u?.role)) throw new ForbiddenException();
    return this.allocs.listForProvider(u, status);
  }
  @Get('allocations/:id') detail(@CurrentUser() u: any, @Param('id') id: string) {
    if (!isProviderRole(u?.role)) throw new ForbiddenException();
    return this.allocs.detail(u, id);
  }
  @Post('allocations/:id/items/:itemId') itemAction(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() b: any) {
    return this.allocs.itemAction(u, id, itemId, b);
  }
  @Post('allocations/:id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.confirm(u, id); }
  @Post('allocations/:id/preparing') preparing(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.preparing(u, id); }
  @Post('allocations/:id/ready') ready(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.ready(u, id); }
  @Post('allocations/:id/out-for-delivery') out(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.outForDelivery(u, id, b); }
  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }
  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }
  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }

  // =========================================================================
  //  BLUEPRINT V1.2 ENDPOINTS (ORDERS)
  // =========================================================================
  @Post('orders/:id/accept')
  async acceptOrder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.providerOrders.acceptOrder(u, id);
  }

  @Post('orders/:id/submit-basket')
  async submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.providerOrders.submitBasket(u, id, b);
  }

  @Post('orders/:id/insurance')
  async evaluateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.providerOrders.evaluateInsurance(u, id, b);
  }

  @Post('orders/:id/preparing')
  async orderPreparing(@CurrentUser() u: any, @Param('id') id: string) {
    return this.providerOrders.orderPreparing(u, id);
  }

  @Post('orders/:id/ready')
  async orderReady(@CurrentUser() u: any, @Param('id') id: string) {
    return this.providerOrders.orderReady(u, id);
  }

  @Post('orders/:id/dispatch')
  async orderDispatch(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.providerOrders.orderDispatch(u, id, b);
  }
}

// =========================================================================
//  PROVIDER INVENTORY EXTENDED (/api/v2/provider/inventory/*)
// =========================================================================
@Controller('provider/inventory')
@UseGuards(JwtAuthGuard)
export class ProviderInventoryExtController {
  constructor(private svc: PharmacyInventoryExtService) {}
  @Get('search') search(@CurrentUser() u: any, @Query('q') q?: string, @Query('barcode') bc?: string) { return this.svc.search(u, q, bc); }
  @Post(':id/restock') restock(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.restock(u, id, Number(b?.qty) || 0); }
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
  private assertTestSeedAllowed() {
    if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
      throw new ServiceUnavailableException('test_seed_disabled');
    }
  }

  @Post('seed') seed(@CurrentUser() u: any) { this.assertTestSeedAllowed(); return this.seedSvc.seed(u); }
  @Post('seed/sample-order') sampleOrder(@CurrentUser() u: any, @Body() b: any) { this.assertTestSeedAllowed(); return this.seedSvc.seedSampleOrder(b?.patient_account_id || u.id); }
  @Post('split/:orderId') async manualSplit(@Param('orderId') id: string) {
    // Backward-compat: if order is in broadcasting state, route to broadcast fallback.
    try { return await this.split.runForOrder(id); }
    catch (e: any) { if (String(e?.message || '').includes('order_not_splittable')) return this.broadcast.fallbackSplit(id); throw e; }
  }
  @Post('expire-stale-allocations') expireStale() { return this.allocs.expireStale(); }
}

// =========================================================================
//  Phase 2A-rework: BROADCAST + CHAT + SHORTAGE controllers
// =========================================================================
@Controller('provider/pharmacy/broadcasts')
@UseGuards(JwtAuthGuard)
export class ProviderBroadcastController {
  constructor(private bc: PharmacyBroadcastService, private offers: PharmacyOfferService) {}
  @Get() list(@CurrentUser() u: any) { return this.bc.listForPharmacy(u); }
  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.bc.detail(u, id); }
  @Post(':orderId/i-have-all') haveAll(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.claimHaveAll(u, oid, b); }
  @Post(':orderId/i-have-partial') havePartial(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondPartial(u, oid, b); }
  @Post(':orderId/offers')
  @UseInterceptors(IdempotencyInterceptor)
  @RequireIdempotency()
  submitOffer(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: SubmitPharmacyOfferDto) { return this.offers.submitOffer(u, oid, b); }
  @Post(':orderId/reject') reject(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondReject(u, oid, b); }
}

@Controller('admin/pharmacy/broadcasts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminBroadcastController {
  constructor(private bc: PharmacyBroadcastService) {}
  @Post(':orderId/advance') advance(@Param('orderId') id: string) { return this.bc.advanceRound(id); }
  @Post(':orderId/fallback-split') fallback(@Param('orderId') id: string) { return this.bc.fallbackSplit(id); }
  @Post('expire-stale') expireStale() { return this.bc.expireStaleBroadcasts(); }
}

@Controller('pharmacy/chat')
@UseGuards(JwtAuthGuard)
export class PharmacyChatController {
  constructor(private chat: PharmacyChatService) {}
  @Get('threads') list(@CurrentUser() u: any, @Query('order_id') oid?: string) { return this.chat.listThreads(u, oid); }
  @Get('threads/:id/messages') msgs(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.listMessages(u, id); }
  @Post('threads/:id/messages') post(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.chat.postMessage(u, id, b); }
  @Post('threads/:id/accept-substitute/:msgId') accept(@CurrentUser() u: any, @Param('id') id: string, @Param('msgId') mid: string) { return this.chat.acceptSubstitute(u, id, mid); }
  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
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
  @Post() report(@CurrentUser() u: any, @Body() b: any) { return this.svc.reportByPharmacy(u, b); }
  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
}

@Controller('admin/pharmacy/shortage-flags')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminShortageController {
  constructor(private svc: PharmacyShortageService) {}
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createByAdmin(u, b); }
  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
  @Get('dashboard') getDashboard(@CurrentUser() u: any) { return this.svc.getShortageDashboard(u); }
  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: any) { return this.svc.adminMarkShortage(u, medicineId, b); }
  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.approve(u, id); }
  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, id, b?.reason); }
  @Post(':id/resolve') resolve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.resolve(u, id); }
}

@Controller('patient/pharmacy/shortage-flags')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientShortageController {
  constructor(private svc: PharmacyShortageService) {}
  @Get('lookup') lookup(@Query('sku') sku?: string, @Query('generic_name') gn?: string) { return this.svc.lookupForPatient(sku, gn); }
}
