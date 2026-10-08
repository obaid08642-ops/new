import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Res } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ReorderEligibilityService } from './reorder-eligibility.service';
import { RefillSubscriptionService } from './refill-subscription.service';
import { AlertService } from './alert.service';
import { ReviewService } from './review.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { OrderState, UserRole, DeliveryState } from '../../common/enums';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReorderPartialDto, CancelDto, RejectBasketDto, OptInCashDto, UpdateInsuranceApprovalDto, RejectDto, PartialDto, PlaceBidDto, AssignDto, DeliveryUpdateDto, AdminTransitionDto, RefillSubscriptionItemDto, CreateRefillSubscriptionDto, CreateAlertDto } from './orders.dto';

@Controller('orders')
@SelfService()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private svc: OrdersService,
    private eligibility: ReorderEligibilityService,
    private refillSubs: RefillSubscriptionService,
    private alerts: AlertService,
    private reviews: ReviewService,
  ) {}

  // Patient only — providers use the read-only Drug Index and can never order
  @Post('create')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  create(@Body() body: CreateOrderDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Get('mine')
  mine(@CurrentUser('id') id: string, @Query('type') type?: string) {
    return this.svc.listMine(id, type);
  }

  @Post(':id/reorder')
  @RequireIdempotency()
  reorder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.reorder(id, user);
  }

  @Post(':id/reorder-partial')
  @RequireIdempotency()
  reorderPartial(@Param('id') id: string, @CurrentUser() user: any, @Body() body: ReorderPartialDto) {
    return this.svc.reorderPartial(id, user, body);
  }

  @Post(':id/cancel')
  @RequireIdempotency()
  cancel(@Param('id') id: string, @CurrentUser() user: any, @Body() body: CancelDto) {
    return this.svc.cancel(id, user, body?.reason || 'patient-cancel');
  }

  // Static pharmacy route must be declared before the `:id` wildcard.
  @Get('pharmacy/queue')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  pharmacyQueue(@CurrentUser('id') id: string, @Query('state') state: OrderState) {
    return this.svc.listForPharmacy(id, state);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getById(id, user);
  }

  @Get(':id/report.pdf')
  async getReportPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: any) {
    const pdfBuffer = await this.svc.generatePdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NabdPlus_Report_${id}.pdf`);
    res.send(pdfBuffer);
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getTracking(id, user);
  }

  /** P22.1 — what "order again" would get wrong: Rx validity + stock flags. */
  @Get(':id/reorder-eligibility')
  reorderEligibility(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eligibility.forOrder(id, user.id);
  }

  /** P22.1 — Auto-refill subscriptions: create, list, get, pause, resume, cancel. */
  @Post('refill-subscriptions')
  createRefillSubscription(@CurrentUser() user: any, @Body() body: CreateRefillSubscriptionDto) {
    return this.refillSubs.create(user.id, body);
  }

  @Get('refill-subscriptions')
  listRefillSubscriptions(@CurrentUser('id') id: string, @Query('status') status?: string) {
    return this.refillSubs.listMine(id, status);
  }

  @Get('refill-subscriptions/:subId')
  getRefillSubscription(@Param('subId') subId: string, @CurrentUser('id') id: string) {
    return this.refillSubs.getById(subId, id);
  }

  @Post('refill-subscriptions/:subId/pause')
  pauseRefillSubscription(@Param('subId') subId: string, @CurrentUser('id') id: string) {
    return this.refillSubs.pause(subId, id);
  }

  @Post('refill-subscriptions/:subId/resume')
  resumeRefillSubscription(@Param('subId') subId: string, @CurrentUser('id') id: string) {
    return this.refillSubs.resume(subId, id);
  }

  @Post('refill-subscriptions/:subId/cancel')
  cancelRefillSubscription(@Param('subId') subId: string, @CurrentUser('id') id: string, @Body() body: { reason?: string }) {
    return this.refillSubs.cancel(subId, id, body?.reason);
  }

  @Get('refill-subscriptions/:subId/eligibility')
  checkRefillSubscriptionEligibility(@Param('subId') subId: string) {
    return this.refillSubs.checkEligibility(subId);
  }

  @Post('refill-subscriptions/:subId/process')
  processRefillSubscription(@Param('subId') subId: string) {
    return this.refillSubs.processRefill(subId);
  }

  /** P22.2 — Back-in-stock & price-drop alerts. */
  @Post('alerts')
  createAlert(@CurrentUser() user: any, @Body() body: CreateAlertDto) {
    return this.alerts.create(user.id, body);
  }

  @Get('alerts')
  listAlerts(@CurrentUser('id') id: string, @Query('status') status?: string) {
    return this.alerts.listMine(id, status);
  }

  @Get('alerts/:alertId')
  getAlert(@Param('alertId') alertId: string, @CurrentUser('id') id: string) {
    return this.alerts.getById(alertId, id);
  }

  @Post('alerts/:alertId/cancel')
  cancelAlert(@Param('alertId') alertId: string, @CurrentUser('id') id: string) {
    return this.alerts.cancel(alertId, id);
  }

  @Get('alerts/:alertId/eligibility')
  checkAlertEligibility(@Param('alertId') alertId: string) {
    return this.alerts.checkEligibility(alertId);
  }

  @Post('alerts/:alertId/process')
  processAlert(@Param('alertId') alertId: string) {
    return this.alerts.processAlert(alertId);
  }

  /** P22.7 — Reviews. */
  @Post('reviews')
  createReview(@CurrentUser() user: any, @Body() body: any) {
    return this.reviews.create(user.id, body);
  }

  @Get('reviews')
  listMyReviews(@CurrentUser('id') id: string) {
    return this.reviews.getPatientReviews(id);
  }

  @Get('reviews/:reviewId')
  getReview(@Param('reviewId') reviewId: string) {
    return this.reviews.getById(reviewId);
  }

  @Get('providers/:providerId/:providerType/reviews')
  getProviderReviews(@Param('providerId') providerId: string, @Param('providerType') providerType: string, @Query('status') status?: string) {
    return this.reviews.getProviderReviews(providerId, providerType, status);
  }

  @Get('providers/:providerId/:providerType/rating')
  getProviderRating(@Param('providerId') providerId: string, @Param('providerType') providerType: string) {
    return this.reviews.getProviderRating(providerId, providerType);
  }

  @Post('reviews/:reviewId/reply')
  providerReply(@Param('reviewId') reviewId: string, @CurrentUser() user: any, @Body() body: { content: string }) {
    return this.reviews.providerReply(reviewId, user.id, { content: body.content, replied_by: user.id });
  }

  @Post('reviews/:reviewId/moderate')
  @Roles(UserRole.ADMIN)
  moderateReview(@Param('reviewId') reviewId: string, @CurrentUser() user: any, @Body() body: { action: 'approve' | 'reject' | 'hide'; reason?: string }) {
    return this.reviews.moderate(reviewId, { action: body.action, moderator_id: user.id, reason: body.reason });
  }

  @Post('reviews/:reviewId/helpful')
  voteHelpful(@Param('reviewId') reviewId: string, @CurrentUser('id') id: string) {
    return this.reviews.voteHelpful(reviewId, id);
  }

  @Delete('reviews/:reviewId/helpful')
  removeHelpfulVote(@Param('reviewId') reviewId: string, @CurrentUser('id') id: string) {
    return this.reviews.removeHelpfulVote(reviewId, id);
  }

  @Patch(':id/items/:itemId/opt-in-cash')
  optInCash(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: OptInCashDto, @CurrentUser() user: any) {
    return this.svc.optInCash(id, itemId, body, user);
  }

  @Patch(':id/insurance-approval')
  @Roles(UserRole.LAB, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.RADIOLOGY, UserRole.ADMIN)
  updateInsuranceApproval(@Param('id') id: string, @Body() body: UpdateInsuranceApprovalDto, @CurrentUser() user: any) {
    return this.svc.updateInsuranceApproval(id, body, user);
  }

  @Post(':id/accept')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.accept(id, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: RejectDto) {
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
  partial(@Param('id') id: string, @CurrentUser() user: any, @Body() body: PartialDto) {
    return this.svc.markPartial(id, user, body.unavailable_medicine_ids || []);
  }

  // Delivery / Admin
  @Post(':id/assign-delivery')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.DELIVERY)
  assign(@Param('id') id: string, @CurrentUser() user: any, @Body() body: AssignDto) {
    return this.svc.assignDelivery(id, body.driver_id, user);
  }

  @Post(':id/delivery/update')
  @Roles(UserRole.DELIVERY, UserRole.ADMIN)
  deliveryUpdate(@Param('id') id: string, @Body() body: DeliveryUpdateDto) {
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
  adminTransition(@Param('id') id: string, @CurrentUser() user: any, @Body() body: AdminTransitionDto) {
    return this.svc.transition(id, body.to, user, body.reason);
  }

  @Post('bids/place')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN)
  placeBid(@CurrentUser() user: any, @Body() b: PlaceBidDto) {
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
