import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PharmacyOpsService } from './pharmacy_ops.service';
import { ServiceUnavailableException } from '@nestjs/common';

const canonicalPharmacyFlowRequired = (): never => { throw new ServiceUnavailableException('canonical_pharmacy_flow_required'); };
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { OrdersService } from '../orders/orders.service';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PHARMACY)
export class PharmacyOpsController {
  constructor(private svc: PharmacyOpsService, private ordersSvc: OrdersService) {}

  // M2: look up a prescription/order by its RX number (dispense screen)
  @Get('prescriptions/:rxNumber') async byRxNumber(@CurrentUser() u: any, @Param('rxNumber') rx: string) {
    const order = await this.ordersSvc.getById(rx).catch(() => null);
    if (order) return order;
    // fallback: search by tracking/prescription number for this pharmacy
    const results = await this.ordersSvc.listForPharmacy(u.id, undefined);
    const match = (results || []).find((o: any) =>
      o?.tracking_id === rx || o?.prescription_number === rx || o?.rx_number === rx);
    if (!match) return { found: false, rx_number: rx };
    return match;
  }

  // M2: end-of-day summary report for the pharmacy
  @Post('reports/eod') async eod(@CurrentUser() u: any) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const completed = await this.ordersSvc.listForPharmacy(u.id, undefined);
    const today = (completed || []).filter((o: any) => new Date(o?.createdAt) >= start);
    const paid = today.filter((o: any) => o?.payment_status === 'paid');
    return {
      date: start.toISOString().slice(0, 10),
      orders_total: today.length,
      orders_paid: paid.length,
      revenue: paid.reduce((s: number, o: any) => s + (o?.total || 0), 0),
      currency: 'SAR',
      by_state: today.reduce((acc: any, o: any) => { acc[o.state || 'unknown'] = (acc[o.state || 'unknown'] || 0) + 1; return acc; }, {}),
    };
  }

  // Order queue tabs
  @Get('orders/incoming') incoming(@CurrentUser() u: any) { return this.svc.incoming(u); }
  @Get('orders/preparing') preparing(@CurrentUser() u: any) { return this.svc.preparing(u); }
  @Get('orders/ready') ready(@CurrentUser() u: any) { return this.svc.ready(u); }
  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }
  @Get('orders/basket-review') basketReview(@CurrentUser() u: any) { return this.svc.basketReview(u); }
  @Get('orders/awaiting-approval') awaitingApproval(@CurrentUser() u: any) { return this.svc.awaitingApproval(u); }
  @Get('orders/refills') refills(@CurrentUser() u: any) { return this.svc.refillOrders(u); }

  // Order actions — delegate to OrdersService transitions
  @Post('orders/:id/accept') accept() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/reject') reject() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/preparing') preparingAction() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/ready') readyAction() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/partial') partial() { return canonicalPharmacyFlowRequired(); }

  // Inventory
  @Get('inventory') inventory(@CurrentUser() u: any) { return this.svc.getInventory(u); }
  @Post('inventory/stock') stock() { return canonicalPharmacyFlowRequired(); }
  @Post('inventory/add') addMed() { return canonicalPharmacyFlowRequired(); }

  // Per-item operations on a pharmacy order
  @Get('orders/:id') orderDetail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.orderDetail(u, id); }
  @Post('orders/:id/items/:idx/unavailable') itemUnavailable() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/items/:idx/restore') itemRestore() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/items/:idx/qty') itemQty() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/items/:idx/substitute') itemSub() { return canonicalPharmacyFlowRequired(); }

  // Basket review workflow
  @Post('orders/:id/submit-basket') submitBasket() { return canonicalPharmacyFlowRequired(); }

  // Insurance pre-auth (pharmacy provider)
  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
    return canonicalPharmacyFlowRequired();
  }
}

/**
 * M2 — Alias surface: the Provider app calls `/provider/pharmacy/*` while the
 * canonical implementation lives under `/pharmacy/*`. Thin delegating controller —
 * no logic duplication.
 */
@Controller('provider/pharmacy')
@UseGuards(JwtAuthGuard)
export class ProviderPharmacyAliasController {
  constructor(private svc: PharmacyOpsService, private ordersSvc: OrdersService) {}

  @Post('orders/:id/accept') accept() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/submit-basket') submitBasket() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/insurance') insurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return canonicalPharmacyFlowRequired();
  }
  @Post('orders/:id/dispatch') dispatch() { return canonicalPharmacyFlowRequired(); }
}
