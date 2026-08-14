import { Module, Injectable, Controller, Get, Post, Param, Body, UseGuards, BadRequestException, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Review, ReviewSchema } from '../../schemas/review.schema';
import { RefundRequest, RefundRequestSchema } from '../../schemas/refund-request.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { EventsModule } from '../events/events.module';
import { EventBusService } from '../events/event-bus.service';

/** Reviews + Refund Requests + Rebook */
@Injectable()
export class PatientUxService {
  constructor(
    @InjectModel('Review') private reviews: Model<any>,
    @InjectModel('RefundRequest') private refunds: Model<any>,
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<any>,
    @InjectModel('RadiologyBooking') private rads: Model<any>,
    @InjectModel('HomeCareBooking') private home: Model<any>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    private events: EventEmitter2,
    private bus: EventBusService,
  ) {}

  private model(k: string): Model<any> {
    return k === 'pharmacy' ? this.orders : k === 'lab' ? this.labs : k === 'radiology' ? this.rads : k === 'nursing' ? this.home : this.appts;
  }

  async rate(user: any, body: { booking_kind: string; booking_id: string; rating: number; comment?: string; aspects?: any }) {
    if (!body.rating || body.rating < 1 || body.rating > 5) throw new BadRequestException('invalid_rating');
    const M = this.model(body.booking_kind);
    const b: any = await M.findOne({ id: body.booking_id }).lean();
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id) throw new BadRequestException('not_owner');

    // Enforce completed booking checks
    const stateStr = (b.state || b.status || '').toUpperCase();
    if (body.booking_kind === 'pharmacy') {
      if (stateStr !== 'DELIVERED') throw new ForbiddenException('You can only rate after order is DELIVERED');
    } else if (body.booking_kind === 'lab') {
      if (stateStr !== 'REPORTED' && stateStr !== 'RESULT_READY') throw new ForbiddenException('You can only rate after lab result is ready/reported');
    } else if (body.booking_kind === 'radiology') {
      if (stateStr !== 'COMPLETED' && stateStr !== 'REPORT_PUBLISHED') throw new ForbiddenException('You can only rate after radiology report is published');
    } else if (body.booking_kind === 'nursing') {
      if (stateStr !== 'COMPLETED') throw new ForbiddenException('You can only rate after home service is COMPLETED');
    } else {
      if (stateStr !== 'COMPLETED') throw new ForbiddenException('You can only rate after appointment is COMPLETED');
    }

    const provider_id = b.provider_id || b.assigned_provider_id || b.doctor_id;
    if (!provider_id) throw new BadRequestException('no_provider');

    const status = body.rating < 3 ? 'pending_review' : 'approved';

    return this.reviews.findOneAndUpdate(
      { booking_kind: body.booking_kind, booking_id: body.booking_id },
      { $set: { provider_id, patient_id: user.id, booking_kind: body.booking_kind, booking_id: body.booking_id, rating: body.rating, comment: body.comment, aspects: body.aspects, status } },
      { upsert: true, new: true }
    );
  }

  async requestRefund(user: any, body: { booking_kind: string; booking_id: string; reason: string; amount?: number }) {
    if (!body.reason) throw new BadRequestException('reason_required');
    const M = this.model(body.booking_kind);
    const b: any = await M.findOne({ id: body.booking_id }).lean();
    if (!b || b.patient_id !== user.id) throw new BadRequestException('not_owner');
    if (!['paid', 'partially_refunded'].includes(b.payment_status)) throw new BadRequestException('not_eligible_for_refund');
    const recordedAmount = Number(b.refundable_amount ?? b.paid_amount ?? b.final_amount ?? b.total_amount ?? b.amount);
    if (!Number.isFinite(recordedAmount) || recordedAmount <= 0) {
      throw new ServiceUnavailableException('A server-recorded paid amount is required before a refund can be requested.');
    }
    const existing = await this.refunds.findOne({ booking_id: body.booking_id, status: 'requested' });
    if (existing) return existing.toObject();
    const rr = await this.refunds.create({ booking_kind: body.booking_kind, booking_id: body.booking_id, patient_id: user.id, reason: body.reason, amount: recordedAmount });
    this.events.emit('refund.requested', rr.toObject());
    return rr.toObject();
  }

  async myRefunds(user: any) {
    return this.refunds.find({ patient_id: user.id }).sort({ createdAt: -1 }).lean();
  }

  /** ADMIN: list all refund requests with optional status filter. */
  async adminListRefunds(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    return this.refunds.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  }

  /** ADMIN: decide on a refund request (approve / reject). */
  async adminDecideRefund(admin: any, id: string, decision: 'approved' | 'rejected', note?: string, amount?: number) {
    const r: any = await this.refunds.findOne({ id });
    if (!r) throw new NotFoundException('refund_not_found');
    if (r.status !== 'requested') throw new BadRequestException('not_pending');
    if (decision === 'approved') {
      throw new ServiceUnavailableException('Refund approval is disabled until it is linked to a verified payment-provider refund and immutable payment ledger.');
    }
    r.status = decision;
    r.decided_at = new Date();
    r.decided_by = admin.id;
    if (note) r.admin_note = note;
    await r.save();
    // Persistent audit log entry (visible in admin events/audit feed)
    this.bus.emit({
      type: `refund.${decision}`,
      entity_type: 'refund_request',
      entity_id: r.id,
      actor_account_id: admin.id,
      actor_role: 'admin',
      patient_account_id: r.patient_id,
      reason_code: r.reason,
      meta: { booking_kind: r.booking_kind, booking_id: r.booking_id, amount: r.amount, note },
    }).catch(() => null);
    this.events.emit('refund.decided', { id, decision });
    return r.toObject();
  }

  /** Re-book a previous booking (clones core fields). */
  async rebook(user: any, body: { booking_kind: string; booking_id: string; scheduled_at: string }) {
    const M = this.model(body.booking_kind);
    const prev: any = await M.findOne({ id: body.booking_id, patient_id: user.id }).lean();
    if (!prev) throw new NotFoundException();
    // Strip non-cloneable fields
    const clone: any = JSON.parse(JSON.stringify(prev));
    delete clone._id; delete clone.id; delete clone.createdAt; delete clone.updatedAt;
    delete clone.state; delete clone.status; delete clone.assignment;
    delete clone.payment_status; delete clone.paid_at; delete clone.transaction_id;
    clone.scheduled_at = body.scheduled_at ? new Date(body.scheduled_at) : new Date();
    clone.state = 'created'; clone.status = 'pending';
    const created = await M.create(clone);
    this.events.emit('booking.rebooked', { kind: body.booking_kind, original_id: body.booking_id, new_id: created.id });
    return { kind: body.booking_kind, id: created.id };
  }
}

@Controller('patient-ux')
@UseGuards(JwtAuthGuard)
export class PatientUxController {
  constructor(private svc: PatientUxService) {}
  @Post('review') rate(@CurrentUser() u: any, @Body() b: any) { return this.svc.rate(u, b); }
  @Post('refund') refund(@CurrentUser() u: any, @Body() b: any) { return this.svc.requestRefund(u, b); }
  @Get('refund/mine') refunds(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
  @Post('rebook') rebook(@CurrentUser() u: any, @Body() b: any) { return this.svc.rebook(u, b); }
}

/** Admin queue for refund requests (approve / reject). */
@Controller('admin/refunds')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminRefundsController {
  constructor(private svc: PatientUxService) {}
  @Get() list() { return this.svc.adminListRefunds(); }
  @Get('pending') pending() { return this.svc.adminListRefunds('requested'); }
  @Post(':id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { decision: 'approved' | 'rejected'; note?: string; amount?: number }) {
    return this.svc.adminDecideRefund(u, id, body.decision, body.note, body.amount);
  }
}

/**
 * Admin Manual Override Controller — used to manually intervene in orders / payments
 * when automated flows get stuck. Every action is logged to the persistent audit log.
 */
@Injectable()
export class AdminOverrideService {
  constructor(
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<any>,
    @InjectModel('RadiologyBooking') private rads: Model<any>,
    @InjectModel('HomeCareBooking') private home: Model<any>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    private bus: EventBusService,
  ) {}
  private modelFor(kind: string): Model<any> | null {
    switch (kind) {
      case 'pharmacy': return this.orders;
      case 'lab': return this.labs;
      case 'radiology': return this.rads;
      case 'nursing': case 'home_care': return this.home;
      case 'care': case 'consultation': return this.appts;
      default: return null;
    }
  }
  async forceCancel(admin: any, kind: string, id: string, reason: string) {
    const M = this.modelFor(kind);
    if (!M) throw new BadRequestException('invalid_kind');
    const doc: any = await M.findOne({ id });
    if (!doc) throw new NotFoundException('not_found');
    const before = { state: doc.state, status: doc.status, payment_status: doc.payment_status };
    doc.state = 'CANCELLED';
    doc.status = 'cancelled';
    doc.cancelled_at = new Date();
    doc.cancel_reason = `admin_override: ${reason}`;
    doc.admin_override_at = new Date();
    doc.admin_override_by = admin.id;
    await doc.save();
    this.bus.emit({
      type: 'admin.override.cancel',
      entity_type: kind === 'pharmacy' ? 'order' : 'booking',
      entity_id: id,
      actor_account_id: admin.id,
      actor_role: 'admin',
      reason_code: reason,
      patient_account_id: doc.patient_id,
      before,
      after: { state: 'CANCELLED', status: 'cancelled' },
      meta: { kind, reason },
    }).catch(() => null);
    return doc.toObject();
  }
  async forceTransition(admin: any, kind: string, id: string, state: string, reason: string) {
    const M = this.modelFor(kind);
    if (!M) throw new BadRequestException('invalid_kind');
    const doc: any = await M.findOne({ id });
    if (!doc) throw new NotFoundException('not_found');
    const before = { state: doc.state, status: doc.status };
    doc.state = state;
    doc.status = state.toLowerCase();
    doc.admin_override_at = new Date();
    doc.admin_override_by = admin.id;
    await doc.save();
    this.bus.emit({
      type: 'admin.override.transition',
      entity_type: kind === 'pharmacy' ? 'order' : 'booking',
      entity_id: id,
      actor_account_id: admin.id,
      actor_role: 'admin',
      reason_code: reason,
      patient_account_id: doc.patient_id,
      before,
      after: { state, status: state.toLowerCase() },
      meta: { kind, target_state: state, reason },
    }).catch(() => null);
    return doc.toObject();
  }
  async markPayment(admin: any, kind: string, id: string, payment_status: 'paid' | 'refunded' | 'failed', reason: string, amount?: number) {
    const M = this.modelFor(kind);
    if (!M) throw new BadRequestException('invalid_kind');
    const doc: any = await M.findOne({ id });
    if (!doc) throw new NotFoundException('not_found');
    const before = { payment_status: doc.payment_status, amount: doc.amount_total };
    doc.payment_status = payment_status;
    if (payment_status === 'refunded') { doc.refunded_at = new Date(); if (amount) doc.refund_amount = amount; }
    if (payment_status === 'paid') doc.paid_at = new Date();
    doc.admin_override_at = new Date();
    doc.admin_override_by = admin.id;
    await doc.save();
    this.bus.emit({
      type: `admin.override.payment_${payment_status}`,
      entity_type: 'payment',
      entity_id: id,
      actor_account_id: admin.id,
      actor_role: 'admin',
      reason_code: reason,
      patient_account_id: doc.patient_id,
      before,
      after: { payment_status, amount },
      meta: { kind, amount, reason },
    }).catch(() => null);
    return doc.toObject();
  }
}

@Controller('admin/override')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminOverrideController {
  constructor(private svc: AdminOverrideService) {}
  /** Force-cancel any order/booking. */
  @Post('cancel') cancel(@CurrentUser() u: any, @Body() body: { kind: string; id: string; reason: string }) {
    if (!body?.reason) throw new BadRequestException('reason_required');
    return this.svc.forceCancel(u, body.kind, body.id, body.reason);
  }
  /** Force any order/booking to a specific state (e.g., COMPLETED, DELIVERED). */
  @Post('transition') transition(@CurrentUser() u: any, @Body() body: { kind: string; id: string; state: string; reason: string }) {
    if (!body?.reason || !body?.state) throw new BadRequestException('reason_and_state_required');
    return this.svc.forceTransition(u, body.kind, body.id, body.state, body.reason);
  }
  /** Manually mark a payment as paid / refunded / failed. */
  @Post('payment') markPayment(@CurrentUser() u: any, @Body() body: { kind: string; id: string; payment_status: 'paid' | 'refunded' | 'failed'; amount?: number; reason: string }) {
    if (!body?.reason || !body?.payment_status) throw new BadRequestException('reason_and_status_required');
    return this.svc.markPayment(u, body.kind, body.id, body.payment_status, body.reason, body.amount);
  }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Review', schema: ReviewSchema },
    { name: 'RefundRequest', schema: RefundRequestSchema },
    { name: 'Order', schema: OrderSchema },
    { name: 'LabBooking', schema: LabBookingSchema },
    { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
    { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
    { name: Appointment.name, schema: AppointmentSchema },
  ]), EventsModule],
  controllers: [PatientUxController, AdminRefundsController, AdminOverrideController],
  providers: [PatientUxService, AdminOverrideService],
  exports: [PatientUxService],
})
export class PatientUxModule {}
