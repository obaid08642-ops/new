import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PharmacyOpsService } from './pharmacy_ops.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { OrdersService } from '../orders/orders.service';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PHARMACY)
export class PharmacyOpsController {
  constructor(private svc: PharmacyOpsService, private ordersSvc: OrdersService) {}

  // Order queue tabs
  @Get('orders/incoming') incoming(@CurrentUser() u: any) { return this.svc.incoming(u); }
  @Get('orders/preparing') preparing(@CurrentUser() u: any) { return this.svc.preparing(u); }
  @Get('orders/ready') ready(@CurrentUser() u: any) { return this.svc.ready(u); }
  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }
  @Get('orders/basket-review') basketReview(@CurrentUser() u: any) { return this.svc.basketReview(u); }
  @Get('orders/awaiting-approval') awaitingApproval(@CurrentUser() u: any) { return this.svc.awaitingApproval(u); }

  // Order actions — delegate to OrdersService transitions
  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
  @Post('orders/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { reason?: string }) { return this.ordersSvc.reject(id, u, b?.reason || ''); }
  @Post('orders/:id/preparing') preparingAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markPreparing(id, u); }
  @Post('orders/:id/ready') readyAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markReady(id, u); }
  @Post('orders/:id/partial') partial(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { unavailable_medicine_ids: string[] }) { return this.ordersSvc.markPartial(id, u, b.unavailable_medicine_ids || []); }

  // Inventory
  @Get('inventory') inventory(@CurrentUser() u: any) { return this.svc.getInventory(u); }
  @Post('inventory/stock') stock(@CurrentUser() u: any, @Body() b: { medicine_id: string; stock_qty: number; is_available?: boolean }) { return this.svc.updateStock(u, b.medicine_id, b.stock_qty, b.is_available !== false); }
  @Post('inventory/add') addMed(@CurrentUser() u: any, @Body() b: any) { return this.svc.addMedicineToInventory(u, b); }

  // Per-item operations on a pharmacy order
  @Get('orders/:id') orderDetail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.orderDetail(u, id); }
  @Post('orders/:id/items/:idx/unavailable') itemUnavailable(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.markItemUnavailable(u, id, parseInt(idx, 10)); }
  @Post('orders/:id/items/:idx/restore') itemRestore(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.restoreItem(u, id, parseInt(idx, 10)); }
  @Post('orders/:id/items/:idx/qty') itemQty(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { qty: number }) { return this.svc.updateItemQty(u, id, parseInt(idx, 10), b.qty); }
  @Post('orders/:id/items/:idx/substitute') itemSub(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { name_ar: string; name_en?: string; medicine_id?: string; qty?: number; price?: number; note?: string }) { return this.svc.substituteItem(u, id, parseInt(idx, 10), b); }

  // Basket review workflow
  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { note?: string }) { return this.svc.submitBasket(u, id, b?.note); }

  // Insurance pre-auth (pharmacy provider)
  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
    return this.svc.setInsuranceStatus(u, id, b.status, b.reason);
  }
}

@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.PATIENT)
export class PatientMedicineLookupController {
  constructor(private svc: PharmacyOpsService) {}

  @Get('medicines/barcode/:barcode')
  lookupBarcode(@Param('barcode') barcode: string) {
    return this.svc.lookupVerifiedMedicineByBarcode(barcode);
  }
}
