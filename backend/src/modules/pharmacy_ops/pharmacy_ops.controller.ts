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
  @Get('prescriptions/:rxNumber') byRxNumber() { return canonicalPharmacyFlowRequired(); }

  // M2: end-of-day summary report for the pharmacy
  @Post('reports/eod') eod() { return canonicalPharmacyFlowRequired(); }

  // Order queue tabs
  @Get('orders/incoming') incoming() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/preparing') preparing() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/ready') ready() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/completed') completed() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/basket-review') basketReview() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/awaiting-approval') awaitingApproval() { return canonicalPharmacyFlowRequired(); }
  @Get('orders/refills') refills() { return canonicalPharmacyFlowRequired(); }

  // Order actions — delegate to OrdersService transitions
  @Post('orders/:id/accept') accept() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/reject') reject() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/preparing') preparingAction() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/ready') readyAction() { return canonicalPharmacyFlowRequired(); }
  @Post('orders/:id/partial') partial() { return canonicalPharmacyFlowRequired(); }

  // Inventory
  @Get('inventory') inventory() { return canonicalPharmacyFlowRequired(); }
  @Post('inventory/stock') stock() { return canonicalPharmacyFlowRequired(); }
  @Post('inventory/add') addMed() { return canonicalPharmacyFlowRequired(); }

  // Per-item operations on a pharmacy order
  @Get('orders/:id') orderDetail() { return canonicalPharmacyFlowRequired(); }
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
