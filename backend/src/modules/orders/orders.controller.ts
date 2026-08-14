import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Res } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { OrderState, UserRole, DeliveryState } from '../../common/enums';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private svc: OrdersService) {}

  // Patient
  @Post('create')
  create(@Body() body: CreateOrderDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }


  @Get('mine')
  mine(@CurrentUser('id') id: string, @Query('type') type?: string) {
    return this.svc.listMine(id, type);
  }

  @Post(':id/reorder')
  reorder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.reorder(id, user);
  }

  @Post(':id/reorder-partial')
  reorderPartial(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.reorderPartial(id, user, body);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.cancel(id, user, body?.reason || 'patient-cancel');
  }

  // Patient: approve/reject pharmacy basket review
  @Post(':id/approve-basket')
  approveBasket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.patientApproveBasket(user, id);
  }
  @Post(':id/reject-basket')
  rejectBasket(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.patientRejectBasket(user, id, body?.reason);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Get(':id/report.pdf')
  async getReportPdf(@Param('id') id: string, @Res() res: any) {
    try {
      const pdfBuffer = await this.svc.generatePdf(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=NabdPlus_Report_${id}.pdf`);
      res.send(pdfBuffer);
    } catch (e) {
      res.status(500).send('Failed to generate PDF');
    }
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string) {
    return this.svc.getTracking(id);
  }

  @Patch(':id/items/:itemId/opt-in-cash')
  optInCash(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.optInCash(id, itemId, body, user);
  }

  // Pharmacy

  @Get('pharmacy/queue')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  pharmacyQueue(@CurrentUser('id') id: string, @Query('state') state: OrderState) {
    return this.svc.listForPharmacy(id, state);
  }

  @Patch(':id/insurance-approval')
  @Roles(UserRole.LAB, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.RADIOLOGY, UserRole.ADMIN)
  updateInsuranceApproval(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateInsuranceApproval(id, body, user);
  }

  @Post(':id/accept')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.accept(id, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.reject(id, user, body?.reason || 'no-reason');
  }

  @Post(':id/preparing')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  preparing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markPreparing(id, user);
  }

  @Post(':id/ready')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  ready(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markReady(id, user);
  }

  @Post(':id/partial')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  partial(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.markPartial(id, user, body.unavailable_medicine_ids || []);
  }

  // Delivery / Admin
  @Post(':id/assign-delivery')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.DELIVERY)
  assign(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { driver_id: string }) {
    return this.svc.assignDelivery(id, body.driver_id, user);
  }

  @Post(':id/delivery/update')
  @Roles(UserRole.DELIVERY, UserRole.ADMIN)
  deliveryUpdate(@Param('id') id: string, @Body() body: { state: DeliveryState; location?: any }) {
    return this.svc.updateDelivery(id, body.state, body.location);
  }

  @Post(':id/dispatch')
  @Roles(UserRole.DELIVERY, UserRole.ADMIN)
  dispatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.transition(id, OrderState.OUT_FOR_DELIVERY, user);
  }

  @Post(':id/delivered')
  @Roles(UserRole.DELIVERY, UserRole.ADMIN, UserRole.PHARMACY)
  delivered(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.transition(id, OrderState.DELIVERED, user);
  }

  // Admin
  @Get()
  @Roles(UserRole.ADMIN)
  list(@Query('state') state: OrderState, @Query('search') search: string) {
    return this.svc.listAll(state, search);
  }

  @Get('admin/escalated')
  @Roles(UserRole.ADMIN)
  escalated() {
    return this.svc.listEscalated();
  }

  @Post(':id/admin/transition')
  @Roles(UserRole.ADMIN)
  adminTransition(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { to: OrderState; reason?: string }) {
    return this.svc.transition(id, body.to, user, body.reason);
  }

  @Post('bids/place')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  placeBid(@CurrentUser() user: any, @Body() b: any) {
    return this.svc.placeBid(user, b);
  }

  @Post('bids/:id/accept')
  acceptBid(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.acceptBid(user, id);
  }

  @Get('bids/request/:id')
  listBids(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.listBids(user, id);
  }

  @Get('bids/pharmacy/mine')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  listPharmacyBids(@CurrentUser() user: any) {
    return this.svc.listPharmacyBids(user);
  }
}
