import { Module, Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { Order, OrderDocument, OrderSchema } from '../../schemas/order.schema';
import { LabBooking, LabBookingSchema, LabBookingState } from '../../schemas/lab.schema';
import { RadiologyBooking, RadiologyBookingSchema, RadiologyBookingState } from '../../schemas/radiology.schema';
import { HomeCareBooking, HomeCareBookingSchema, HomeCareBookingState } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema, APPT_STATES } from '../../schemas/appointment.schema';
import { OrderState, ServiceState, ServiceDomain } from '../../common/enums';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { PharmacyOrderSchema } from '../pharmacy/schemas/pharmacy.schema';
import { EventBusService } from '../events/event-bus.service';
import { LabsService } from '../labs/labs.service';
import { RadiologyOpsService } from '../radiology/radiology.service';
import { HomeCareSvc } from '../home-care/home-care.service';
import { AppointmentsService } from '../care/appointments.service';
import { SlotService } from '../care/slot.service';
import { OrdersService } from '../orders/orders.service';
import { CartService } from '../cart/cart.module';
import { WorkflowEngineModule, WorkflowEngineService, toUniversal } from '../workflow-engine/workflow-engine.module';

/**
 * UNIFIED BOOKING ORCHESTRATOR
 * Single entry-point over ALL 5 domains. Reads from every domain into one
 * timeline + dispatches cart lines to each domain's create method + uses
 * WorkflowEngine for every cancel/reschedule transition.
 */
@Injectable()
export class UnifiedBookingsService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('PharmacyOrder') private pharmacyOrders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    private bus: EventBusService,
    private labsSvc: LabsService,
    private radSvc: RadiologyOpsService,
    private homeSvc: HomeCareSvc,
    private apptSvc: AppointmentsService,
    private slots: SlotService,
    private ordersSvc: OrdersService,
    private cart: CartService,
    private engine: WorkflowEngineService,
  ) {}

  private kindMap: Record<string, ServiceDomain> = {
    pharmacy: 'pharmacy', lab: 'lab', radiology: 'radiology',
    nursing: 'nursing', home_care: 'nursing',
    consultation: 'consultation', doctor: 'consultation',
  };

  /** Unified timeline across pharmacy + lab + radiology + nursing + consultation. */
  async myTimeline(user: any, filter: { state?: string; kind?: string } = {}) {
    const [orders, pharmOrders, labs, rads, home, appts] = await Promise.all([
      this.orders.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.pharmacyOrders.find({ patient_account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.labs.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.rads.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.home.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
      this.appts.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    const unify = (kind: ServiceDomain, domainState: string, x: any) => {
      const us = toUniversal(kind, domainState);
      return {
        kind,
        id: x.id,
        tracking_id: x.tracking_id || x.id,
        domain_state: domainState,
        universal_state: us,
        total: x.total || x.subtotal || x.price || 0,
        title_ar: x.items?.[0]?.name_ar || x.service_name_ar || (kind === 'pharmacy' ? 'طلب صيدلية' : kind === 'lab' ? 'حجز تحاليل' : kind === 'radiology' ? 'حجز أشعة' : kind === 'nursing' ? 'رعاية منزلية' : 'استشارة'),
        payment_method: x.payment_method || 'cash',
        insurance_status: x.insurance_status,
        scheduled_at: x.scheduled_at || x.slot_start,
        location_type: x.location_type,
        account_id: x.provider_account_id || x.pharmacy_id || x.doctor_user_id,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
        can_cancel: us !== ServiceState.COMPLETED && us !== ServiceState.CANCELLED,
        can_reschedule: ['lab', 'radiology', 'nursing', 'consultation'].includes(kind) && [ServiceState.ASSIGNED, ServiceState.CONFIRMED].includes(us),
      };
    };
    const merged = [
      ...orders.map(o => unify('pharmacy', o.state, o)),
      ...pharmOrders.map((o: any) => unify('pharmacy', o.status, { ...o, total: o.totals?.total })),
      ...labs.map(l => unify('lab', l.state, l)),
      ...rads.map(r => unify('radiology', r.state, r)),
      ...home.map(h => unify('nursing', h.state, h)),
      ...appts.map(a => unify('consultation', a.status, a)),
    ].filter(x => (!filter.state || x.universal_state === filter.state) && (!filter.kind || x.kind === filter.kind))
     .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
    return merged;
  }

  async getOne(user: any, kind: string, id: string) {
    const k = this.kindMap[kind];
    let result: any;
    if (k === 'pharmacy') result = await this.orders.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
    else if (k === 'lab') result = await this.labs.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
    else if (k === 'radiology') result = await this.rads.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
    else if (k === 'nursing') result = await this.home.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
    else if (k === 'consultation') result = await this.appts.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
    else throw new BadRequestException('invalid_kind');
    if (!result) throw new NotFoundException('booking_not_found');
    return result;
  }

  /** Unified cancel — delegates to the proper domain service which already routes through engine. */
  async cancelBooking(user: any, kind: string, id: string, reason: string) {
    const k = this.kindMap[kind];
    if (k === 'lab') return this.labsSvc.cancel(id, user);
    if (k === 'radiology') return this.radSvc.cancel(id, user);
    if (k === 'nursing') return this.homeSvc.cancel(id, user);
    if (k === 'consultation') return this.apptSvc.cancel(id, user, reason);
    if (k === 'pharmacy') return this.ordersSvc.cancel(id, user, reason || 'patient_cancel');
    throw new BadRequestException('invalid_kind');
  }

  /** Unified reschedule — supports labs, radiology, nursing, consultation. */
  async rescheduleBooking(user: any, kind: string, id: string, new_scheduled_at: string, reason?: string) {
    if (!new_scheduled_at) throw new BadRequestException('scheduled_at_required');
    const nt = new Date(new_scheduled_at);
    if (nt.getTime() < Date.now()) throw new BadRequestException('slot_expired');
    const k = this.kindMap[kind];
    if (k === 'lab') {
      const b = await this.labs.findOne({ id, patient_id: user.id });
      if (!b) throw new NotFoundException();
      if (![LabBookingState.NEW_REQUEST, LabBookingState.CONFIRMED].includes(b.state)) throw new BadRequestException('cannot_reschedule');
      b.scheduled_at = nt; await b.save();
      this.bus.emit({ type: 'service.confirmed', entity_type: 'lab_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'lab' } } as any).catch(() => null);
      return b.toObject();
    }
    if (k === 'radiology') {
      const b = await this.rads.findOne({ id, patient_id: user.id });
      if (!b) throw new NotFoundException();
      if (![RadiologyBookingState.PENDING, RadiologyBookingState.CONFIRMED, RadiologyBookingState.CONFIRMED].includes(b.state)) throw new BadRequestException('cannot_reschedule');
      b.scheduled_at = nt; await b.save();
      this.bus.emit({ type: 'service.confirmed', entity_type: 'radiology_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'radiology' } } as any).catch(() => null);
      return b.toObject();
    }
    if (k === 'nursing') {
      const b = await this.home.findOne({ id, patient_id: user.id });
      if (!b) throw new NotFoundException();
      if ([HomeCareBookingState.COMPLETED, HomeCareBookingState.CANCELLED].includes(b.state)) throw new BadRequestException('cannot_reschedule');
      b.scheduled_at = nt; await b.save();
      this.bus.emit({ type: 'service.confirmed', entity_type: 'nursing_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'nursing' } } as any).catch(() => null);
      return b.toObject();
    }
    if (k === 'consultation') {
      return this.apptSvc.reschedule(id, user, { slot_start: new_scheduled_at });
    }
    throw new BadRequestException('reschedule_not_supported_for_kind');
  }

  /**
   * Resolves a slot only from the server-generated availability window.
   * The currently published discovery API uses the canonical ISO start time as
   * its slot identifier; arbitrary timestamps are never forwarded to booking.
   */
  private async resolveConsultationSlot(doctorId: string, type: 'clinic' | 'video' | 'home', slotId: string): Promise<string> {
    if (!doctorId || !slotId || !type) throw new BadRequestException('doctor_id_slot_id_and_type_required');
    const requested = new Date(slotId);
    if (Number.isNaN(requested.getTime())) throw new BadRequestException('invalid_slot_id');

    const doctor: any = await this.providers.findOne({ id: doctorId });
    if (!doctor) throw new NotFoundException('doctor_not_found');
    const availability = await this.slots.slotsForDate(doctor, requested.toISOString().slice(0, 10), type);
    const slot = (availability?.slots || []).find((candidate: any) => candidate.start === slotId);
    if (!slot) throw new BadRequestException('slot_not_available');
    if (!slot.available) throw new ConflictException('slot_taken');
    return slot.start;
  }

  /**
   * Contract bridge for patient-web consultation booking. This is intentionally
   * cash-only: the payment-intent/10-minute hold workflow is not implemented
   * here and unsupported payment methods fail closed rather than simulating a
   * pending-payment success.
   */
  async createConsultationContract(user: any, body: {
    doctor_id?: string;
    slot_id?: string;
    type?: 'clinic' | 'video' | 'home';
    notes?: string;
    payment_method_id?: string;
  }) {
    const paymentMethod = body?.payment_method_id || 'cash';
    if (paymentMethod !== 'cash') throw new BadRequestException('payment_method_not_supported');
    const slotStart = await this.resolveConsultationSlot(body?.doctor_id || '', body?.type as any, body?.slot_id || '');
    const booking: any = await this.apptSvc.create(user, {
      doctor_id: body!.doctor_id!,
      service_type: body!.type!,
      slot_start: slotStart,
      patient_notes: body?.notes,
      payment_method: 'cash',
    });
    return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
  }

  /** Owner-scoped root cancellation; foreign IDs resolve as 404 via getOne. */
  async cancelConsultationContract(user: any, id: string, reason?: string) {
    await this.getOne(user, 'consultation', id);
    const booking: any = await this.apptSvc.cancel(id, user, reason);
    return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
  }

  /** Owner-scoped root reschedule with the same server-side slot resolution. */
  async rescheduleConsultationContract(user: any, id: string, newSlotId?: string) {
    const current: any = await this.getOne(user, 'consultation', id);
    const slotStart = await this.resolveConsultationSlot(current.doctor_id, current.service_type, newSlotId || '');
    const booking: any = await this.apptSvc.reschedule(id, user, { slot_start: slotStart });
    return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
  }

  /**
   * SMART MATCH — delegates to WorkflowEngine.rankProviders so the matching
   * logic lives in ONE place (capability + insurance + availability + distance).
   */
  async smartMatch(user: any, body: {
    kind: 'lab' | 'radiology' | 'nursing' | 'consultation' | 'pharmacy';
    service_ids?: string[];
    service_keys?: string[];
    specialty?: string;
    insurance?: string;
    home_visit?: boolean;
    city?: string;
    location?: { lat: number; lng: number };
    max_results?: number;
  }) {
    const k = this.kindMap[body.kind] || (body.kind as any);
    return this.engine.rankProviders({
      kind: k, service_ids: body.service_ids, service_keys: body.service_keys,
      specialty: body.specialty, insurance: body.insurance,
      home_visit: body.home_visit, city: body.city, location: body.location,
      max_results: body.max_results,
    });
  }

  /**
   * Nursing radius fallback broadcast — 3km→5km→10km expansion.
   * If `auto_book=true` and at least one provider matched, creates a real
   * HomeCareBooking via the home-care service so the engine's lifecycle takes
   * over immediately (REQUESTED → MATCHING → ASSIGNED on top match).
   */
  async nursingRadiusBroadcast(user: any, body: { service_keys: string[]; service_id?: string; scheduled_at?: string; address?: any; city?: string; insurance?: string; location?: { lat: number; lng: number }; auto_book?: boolean }) {
    let chosen: any = null;
    let radiusUsed = 10;
    for (const radius of [3, 5, 10]) {
      const list = await this.engine.rankProviders({
        kind: 'nursing', service_keys: body.service_keys, insurance: body.insurance,
        city: body.city, home_visit: true, location: body.location, max_results: 30,
      });
      const filtered = body.location
        ? list.filter((p: any) => p.distance_km == null || p.distance_km <= radius)
        : list;
      if (filtered.length > 0) { chosen = filtered; radiusUsed = radius; break; }
    }
    if (!chosen || chosen.length === 0) return { radius_used: 10, providers: [], booking: null };
    if (!body.auto_book || !body.service_id) return { radius_used: radiusUsed, providers: chosen, booking: null };
    // Auto-book on the top-ranked provider; engine drives REQUESTED→ASSIGNED.
    const booking: any = await this.homeSvc.book(user, {
      service_id: body.service_id,
      scheduled_at: body.scheduled_at,
      address: body.address,
      contact: { name: user.full_name, phone: user.phone },
      payment_method: 'cash',
      sessions_count: 1,
    });
    await this.engine.transition({
      kind: 'nursing', entity_id: booking.id, from_domain: booking.state, to_domain: HomeCareBookingState.PROVIDER_ASSIGNED,
      actor_role: 'system', patient_account_id: user.id, reason: 'radius_match',
      mutate: async () => {
        const b = await this.home.findOne({ id: booking.id });
        if (b) {
          b.state = HomeCareBookingState.PROVIDER_ASSIGNED;
          (b as any).provider_account_id = chosen[0].account_id || chosen[0].provider_account_id;
          b.state_history.push({ from: booking.state, to: HomeCareBookingState.PROVIDER_ASSIGNED, by_user_id: 'system', at: new Date() });
          await b.save();
          return b.toObject();
        }
        return booking;
      },
    }).catch(() => null);
    return { radius_used: radiusUsed, providers: chosen, booking };
  }

  /**
   * Cart-driven checkout. Dispatches each cart group to its domain. Pharmacy,
   * lab, radiology, home_care, and doctor all supported now.
   */
  async checkoutFromCart(user: any, body: { provider_account_id?: string; address?: any; scheduled_at?: string; insurance?: any; location_type?: 'home' | 'facility'; delivery_address?: any }) {
    const cart = await this.cart.get(user);
    if (!cart?.groups?.length) throw new BadRequestException('cart_empty');

    if (body.provider_account_id) {
      const provider = await this.providers.findOne({ account_id: body.provider_account_id });
      if (provider && provider.verified !== true) {
        throw new BadRequestException('provider_not_verified_by_admin');
      }
    }

    const results: any[] = [];
    for (const g of cart.groups as any[]) {
      try {
        if (g.kind === 'lab') {
          const items = g.items.map((l: any) => ({ service_id: l.service_id, name_ar: l.name_ar, price: l.price }));
          const r = await this.labsSvc.book(user, {
            items, scheduled_at: body.scheduled_at, account_id: body.provider_account_id,
            location_type: body.location_type || 'facility', address: body.address,
            payment_method: g.items[0]?.payment_method || 'cash',
            insurance_provider: g.items[0]?.insurance_provider,
          });
          results.push({ kind: 'lab', ok: true, id: (r as any).id, tracking_id: (r as any).tracking_id });
        } else if (g.kind === 'radiology') {
          const items = g.items.map((l: any) => ({ service_id: l.service_id, name_ar: l.name_ar, price: l.price }));
          const r = await this.radSvc.book(user, {
            items, scheduled_at: body.scheduled_at, account_id: body.provider_account_id,
            location_type: body.location_type || 'facility', address: body.address,
            payment_method: g.items[0]?.payment_method || 'cash',
            insurance_provider: g.items[0]?.insurance_provider,
          });
          results.push({ kind: 'radiology', ok: true, id: (r as any).id });
        } else if (g.kind === 'home_care') {
          // One booking per line because each home-care service has its own scheduled_at
          for (const l of g.items) {
            const r = await this.homeSvc.book(user, {
              service_id: l.service_id, scheduled_at: body.scheduled_at,
              address: body.address, contact: { name: user.full_name, phone: user.phone },
              payment_method: l.payment_method || 'cash',
              sessions_count: l.qty || 1,
            });
            results.push({ kind: 'home_care', ok: true, id: (r as any).id });
          }
        } else if (g.kind === 'doctor') {
          for (const l of g.items) {
            const meta = l.meta || {};
            const docId = meta.doctor_id || l.service_id;
            const doc = await this.providers.findOne({ account_id: docId });
            if (doc && doc.verified !== true) {
              throw new BadRequestException('provider_not_verified_by_admin');
            }
            const r = await this.apptSvc.create(user, {
              doctor_id: docId,
              service_type: meta.service_type || 'clinic',
              slot_start: body.scheduled_at || meta.slot_start,
              duration_minutes: meta.duration_minutes,
              patient_notes: l.notes,
              symptoms: meta.symptoms,
              visit_location: meta.visit_location,
            });
            results.push({ kind: 'doctor', ok: true, id: (r as any).id });
          }
        } else if (g.kind === 'pharmacy') {
          // Pharmacy needs delivery_address with lat/lng — taken from body or address
          const addr = body.delivery_address || body.address;
          if (!addr?.lat || !addr?.lng) {
            results.push({ kind: 'pharmacy', ok: false, error: 'delivery_address_with_lat_lng_required' });
          } else {
            const items = g.items.map((l: any) => ({ medicine_id: l.service_id, qty: l.qty || 1, name_ar: l.name_ar, price: l.price }));
            const r = await this.ordersSvc.create(user, { items, delivery_address: addr });
            results.push({ kind: 'pharmacy', ok: true, id: (r as any).id });
          }
        } else {
          results.push({ kind: g.kind, ok: false, error: 'unsupported_kind' });
        }
      } catch (e: any) {
        results.push({ kind: g.kind, ok: false, error: e?.message || e?.response?.message || 'failed' });
      }
    }
    // Atomic-ish rollback: if ANY group failed, cancel all bookings created
    // earlier in this run so the patient never ends up with a half-cart state.
    const anyFailed = results.some(r => !r.ok);
    if (anyFailed) {
      for (const r of results) {
        if (!r.ok || !r.id) continue;
        try { await this.cancelBooking({ id: user.id, role: 'system' }, r.kind, r.id, 'checkout_rollback'); r.rolled_back = true; } catch { /* ignore */ }
      }
      return { results, remaining_cart: await this.cart.get(user), rolled_back: true };
    }
    // All groups succeeded — clear those cart lines.
    for (const r of results) if (r.ok) await this.cart.clear(user, r.kind);
    return { results, remaining_cart: await this.cart.get(user), rolled_back: false };
  }
}

@Controller('unified-bookings')
@UseGuards(JwtAuthGuard)
export class UnifiedBookingsController {
  constructor(private svc: UnifiedBookingsService) {}

  @Get('mine') mine(@CurrentUser() u: any, @Query() q: any) { return this.svc.myTimeline(u, { state: q.state, kind: q.kind }); }
  @Post()
  @RequireIdempotency()
  create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createConsultationContract(u, b); }
  @Post(':id/cancel')
  @RequireIdempotency()
  cancelRoot(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.cancelConsultationContract(u, id, b.reason); }
  @Post(':id/reschedule')
  @RequireIdempotency()
  rescheduleRoot(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.rescheduleConsultationContract(u, id, b.new_slot_id); }
  @Get(':kind/:id') one(@CurrentUser() u: any, @Param('kind') k: string, @Param('id') id: string) { return this.svc.getOne(u, k, id); }
  @Post(':kind/:id/cancel')
  @RequireIdempotency()
  cancel(@CurrentUser() u: any, @Param('kind') k: string, @Param('id') id: string, @Body() b: any) { return this.svc.cancelBooking(u, k, id, b.reason || ''); }
  @Patch(':kind/:id/reschedule')
  @RequireIdempotency()
  resched(@CurrentUser() u: any, @Param('kind') k: string, @Param('id') id: string, @Body() b: any) { return this.svc.rescheduleBooking(u, k, id, b.scheduled_at, b.reason); }
  @Post('match') match(@CurrentUser() u: any, @Body() b: any) { return this.svc.smartMatch(u, b); }
  @Post('nursing-broadcast')
  @RequireIdempotency()
  nursing(@CurrentUser() u: any, @Body() b: any) { return this.svc.nursingRadiusBroadcast(u, b); }
  @Post('checkout-cart')
  @RequireIdempotency()
  checkout(@CurrentUser() u: any, @Body() b: any) { return this.svc.checkoutFromCart(u, b); }
}

import { LabsModule } from '../labs/labs.module';
import { RadiologyModule } from '../radiology/radiology.module';
import { CartModule } from '../cart/cart.module';
import { HomeCareModule } from '../home-care/home-care.module';
import { CareModule } from '../care/care.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'PharmacyOrder', schema: PharmacyOrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
    ]),
    LabsModule,
    RadiologyModule,
    HomeCareModule,
    CareModule,
    OrdersModule,
    CartModule,
    WorkflowEngineModule,
  ],
  controllers: [UnifiedBookingsController],
  providers: [UnifiedBookingsService],
})
export class UnifiedBookingsModule {}
