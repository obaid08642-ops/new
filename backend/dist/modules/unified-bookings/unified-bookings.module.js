"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedBookingsModule = exports.UnifiedBookingsController = exports.UnifiedBookingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const enums_1 = require("../../common/enums");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const pharmacy_schema_1 = require("../pharmacy/schemas/pharmacy.schema");
const event_bus_service_1 = require("../events/event-bus.service");
const labs_service_1 = require("../labs/labs.service");
const radiology_service_1 = require("../radiology/radiology.service");
const home_care_service_1 = require("../home-care/home-care.service");
const appointments_service_1 = require("../care/appointments.service");
const slot_service_1 = require("../care/slot.service");
const orders_service_1 = require("../orders/orders.service");
const cart_module_1 = require("../cart/cart.module");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const livekit_module_1 = require("../livekit/livekit.module");
const livekit_service_1 = require("../livekit/livekit.service");
let UnifiedBookingsService = class UnifiedBookingsService {
    constructor(orders, pharmacyOrders, labs, rads, home, appts, providers, bus, labsSvc, radSvc, homeSvc, apptSvc, slots, ordersSvc, cart, engine, livekit) {
        this.orders = orders;
        this.pharmacyOrders = pharmacyOrders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.providers = providers;
        this.bus = bus;
        this.labsSvc = labsSvc;
        this.radSvc = radSvc;
        this.homeSvc = homeSvc;
        this.apptSvc = apptSvc;
        this.slots = slots;
        this.ordersSvc = ordersSvc;
        this.cart = cart;
        this.engine = engine;
        this.livekit = livekit;
        this.kindMap = {
            pharmacy: 'pharmacy', lab: 'lab', radiology: 'radiology',
            nursing: 'nursing', home_care: 'nursing',
            consultation: 'consultation', doctor: 'consultation',
        };
    }
    async myTimeline(user, filter = {}) {
        const [orders, pharmOrders, labs, rads, home, appts] = await Promise.all([
            this.orders.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
            this.pharmacyOrders.find({ patient_account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
            this.labs.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
            this.rads.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
            this.home.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
            this.appts.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
        ]);
        const unify = (kind, domainState, x) => {
            const us = (0, workflow_engine_module_1.toUniversal)(kind, domainState);
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
                can_cancel: us !== enums_1.ServiceState.COMPLETED && us !== enums_1.ServiceState.CANCELLED,
                can_reschedule: ['lab', 'radiology', 'nursing', 'consultation'].includes(kind) && [enums_1.ServiceState.ASSIGNED, enums_1.ServiceState.CONFIRMED].includes(us),
            };
        };
        const merged = [
            ...orders.map(o => unify('pharmacy', o.state, o)),
            ...pharmOrders.map((o) => unify('pharmacy', o.status, { ...o, total: o.totals?.total })),
            ...labs.map(l => unify('lab', l.state, l)),
            ...rads.map(r => unify('radiology', r.state, r)),
            ...home.map(h => unify('nursing', h.state, h)),
            ...appts.map(a => unify('consultation', a.status, a)),
        ].filter(x => (!filter.state || x.universal_state === filter.state) && (!filter.kind || x.kind === filter.kind))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged;
    }
    async getOne(user, kind, id) {
        const k = this.kindMap[kind];
        let result;
        if (k === 'pharmacy')
            result = await this.orders.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
        else if (k === 'lab')
            result = await this.labs.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
        else if (k === 'radiology')
            result = await this.rads.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
        else if (k === 'nursing')
            result = await this.home.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
        else if (k === 'consultation')
            result = await this.appts.findOne({ id, patient_id: user.id }, { _id: 0, __v: 0 }).lean();
        else
            throw new common_1.BadRequestException('invalid_kind');
        if (!result)
            throw new common_1.NotFoundException('booking_not_found');
        return result;
    }
    async cancelBooking(user, kind, id, reason) {
        const k = this.kindMap[kind];
        if (k === 'lab')
            return this.labsSvc.cancel(id, user);
        if (k === 'radiology')
            return this.radSvc.cancel(id, user);
        if (k === 'nursing')
            return this.homeSvc.cancel(id, user);
        if (k === 'consultation')
            return this.apptSvc.cancel(id, user, reason);
        if (k === 'pharmacy')
            return this.ordersSvc.cancel(id, user, reason || 'patient_cancel');
        throw new common_1.BadRequestException('invalid_kind');
    }
    async rescheduleBooking(user, kind, id, new_scheduled_at, reason) {
        if (!new_scheduled_at)
            throw new common_1.BadRequestException('scheduled_at_required');
        const nt = new Date(new_scheduled_at);
        if (nt.getTime() < Date.now())
            throw new common_1.BadRequestException('slot_expired');
        const k = this.kindMap[kind];
        if (k === 'lab') {
            const b = await this.labs.findOne({ id, patient_id: user.id });
            if (!b)
                throw new common_1.NotFoundException();
            if (![lab_schema_1.LabBookingState.NEW_REQUEST, lab_schema_1.LabBookingState.CONFIRMED].includes(b.state))
                throw new common_1.BadRequestException('cannot_reschedule');
            b.scheduled_at = nt;
            await b.save();
            this.bus.emit({ type: 'service.confirmed', entity_type: 'lab_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'lab' } }).catch(() => null);
            return b.toObject();
        }
        if (k === 'radiology') {
            const b = await this.rads.findOne({ id, patient_id: user.id });
            if (!b)
                throw new common_1.NotFoundException();
            if (![radiology_schema_1.RadiologyBookingState.PENDING, radiology_schema_1.RadiologyBookingState.CONFIRMED, radiology_schema_1.RadiologyBookingState.CONFIRMED].includes(b.state))
                throw new common_1.BadRequestException('cannot_reschedule');
            b.scheduled_at = nt;
            await b.save();
            this.bus.emit({ type: 'service.confirmed', entity_type: 'radiology_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'radiology' } }).catch(() => null);
            return b.toObject();
        }
        if (k === 'nursing') {
            const b = await this.home.findOne({ id, patient_id: user.id });
            if (!b)
                throw new common_1.NotFoundException();
            if ([home_care_schema_1.HomeCareBookingState.COMPLETED, home_care_schema_1.HomeCareBookingState.CANCELLED].includes(b.state))
                throw new common_1.BadRequestException('cannot_reschedule');
            b.scheduled_at = nt;
            await b.save();
            this.bus.emit({ type: 'service.confirmed', entity_type: 'nursing_booking', entity_id: id, actor_account_id: user.id, actor_role: 'patient', meta: { rescheduled_to: nt, reason, kind: 'nursing' } }).catch(() => null);
            return b.toObject();
        }
        if (k === 'consultation') {
            return this.apptSvc.reschedule(id, user, { slot_start: new_scheduled_at });
        }
        throw new common_1.BadRequestException('reschedule_not_supported_for_kind');
    }
    async resolveConsultationSlot(doctorId, type, slotId) {
        if (!doctorId || !slotId || !type)
            throw new common_1.BadRequestException('doctor_id_slot_id_and_type_required');
        const requested = new Date(slotId);
        if (Number.isNaN(requested.getTime()))
            throw new common_1.BadRequestException('invalid_slot_id');
        const doctor = await this.providers.findOne({ id: doctorId });
        if (!doctor)
            throw new common_1.NotFoundException('doctor_not_found');
        const availability = await this.slots.slotsForDate(doctor, requested.toISOString().slice(0, 10), type);
        const slot = (availability?.slots || []).find((candidate) => candidate.start === slotId);
        if (!slot)
            throw new common_1.BadRequestException('slot_not_available');
        if (!slot.available)
            throw new common_1.ConflictException('slot_taken');
        return slot.start;
    }
    async createConsultationContract(user, body) {
        const paymentMethod = body?.payment_method_id || 'cash';
        if (paymentMethod !== 'cash')
            throw new common_1.BadRequestException('payment_method_not_supported');
        const slotStart = await this.resolveConsultationSlot(body?.doctor_id || '', body?.type, body?.slot_id || '');
        const booking = await this.apptSvc.create(user, {
            doctor_id: body.doctor_id,
            service_type: body.type,
            slot_start: slotStart,
            patient_notes: body?.notes,
            payment_method: 'cash',
        });
        return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
    }
    async cancelConsultationContract(user, id, reason) {
        await this.getOne(user, 'consultation', id);
        const booking = await this.apptSvc.cancel(id, user, reason);
        return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
    }
    async rescheduleConsultationContract(user, id, newSlotId) {
        const current = await this.getOne(user, 'consultation', id);
        const slotStart = await this.resolveConsultationSlot(current.doctor_id, current.service_type, newSlotId || '');
        const booking = await this.apptSvc.reschedule(id, user, { slot_start: slotStart });
        return { booking_id: booking.id, status: String(booking.status || '').toLowerCase() };
    }
    async consultationCallToken(user, id) {
        return this.livekit.issueBookingCallToken(id, user);
    }
    async smartMatch(user, body) {
        const k = this.kindMap[body.kind] || body.kind;
        return this.engine.rankProviders({
            kind: k, service_ids: body.service_ids, service_keys: body.service_keys,
            specialty: body.specialty, insurance: body.insurance,
            home_visit: body.home_visit, city: body.city, location: body.location,
            max_results: body.max_results,
        });
    }
    async nursingRadiusBroadcast(user, body) {
        let chosen = null;
        let radiusUsed = 10;
        for (const radius of [3, 5, 10]) {
            const list = await this.engine.rankProviders({
                kind: 'nursing', service_keys: body.service_keys, insurance: body.insurance,
                city: body.city, home_visit: true, location: body.location, max_results: 30,
            });
            const filtered = body.location
                ? list.filter((p) => p.distance_km == null || p.distance_km <= radius)
                : list;
            if (filtered.length > 0) {
                chosen = filtered;
                radiusUsed = radius;
                break;
            }
        }
        if (!chosen || chosen.length === 0)
            return { radius_used: 10, providers: [], booking: null };
        if (!body.auto_book || !body.service_id)
            return { radius_used: radiusUsed, providers: chosen, booking: null };
        const booking = await this.homeSvc.book(user, {
            service_id: body.service_id,
            scheduled_at: body.scheduled_at,
            address: body.address,
            contact: { name: user.full_name, phone: user.phone },
            payment_method: 'cash',
            sessions_count: 1,
        });
        await this.engine.transition({
            kind: 'nursing', entity_id: booking.id, from_domain: booking.state, to_domain: home_care_schema_1.HomeCareBookingState.PROVIDER_ASSIGNED,
            actor_role: 'system', patient_account_id: user.id, reason: 'radius_match',
            mutate: async () => {
                const b = await this.home.findOne({ id: booking.id });
                if (b) {
                    b.state = home_care_schema_1.HomeCareBookingState.PROVIDER_ASSIGNED;
                    b.provider_account_id = chosen[0].account_id || chosen[0].provider_account_id;
                    b.state_history.push({ from: booking.state, to: home_care_schema_1.HomeCareBookingState.PROVIDER_ASSIGNED, by_user_id: 'system', at: new Date() });
                    await b.save();
                    return b.toObject();
                }
                return booking;
            },
        }).catch(() => null);
        return { radius_used: radiusUsed, providers: chosen, booking };
    }
    async checkoutFromCart(user, body) {
        const cart = await this.cart.get(user);
        if (!cart?.groups?.length)
            throw new common_1.BadRequestException('cart_empty');
        if (body.provider_account_id) {
            const provider = await this.providers.findOne({ account_id: body.provider_account_id });
            if (provider && provider.verified !== true) {
                throw new common_1.BadRequestException('provider_not_verified_by_admin');
            }
        }
        const results = [];
        for (const g of cart.groups) {
            try {
                if (g.kind === 'lab') {
                    const items = g.items.map((l) => ({ service_id: l.service_id, name_ar: l.name_ar, price: l.price }));
                    const r = await this.labsSvc.book(user, {
                        items, scheduled_at: body.scheduled_at, account_id: body.provider_account_id,
                        location_type: body.location_type || 'facility', address: body.address,
                        payment_method: g.items[0]?.payment_method || 'cash',
                        insurance_provider: g.items[0]?.insurance_provider,
                    });
                    results.push({ kind: 'lab', ok: true, id: r.id, tracking_id: r.tracking_id });
                }
                else if (g.kind === 'radiology') {
                    const items = g.items.map((l) => ({ service_id: l.service_id, name_ar: l.name_ar, price: l.price }));
                    const r = await this.radSvc.book(user, {
                        items, scheduled_at: body.scheduled_at, account_id: body.provider_account_id,
                        location_type: body.location_type || 'facility', address: body.address,
                        payment_method: g.items[0]?.payment_method || 'cash',
                        insurance_provider: g.items[0]?.insurance_provider,
                    });
                    results.push({ kind: 'radiology', ok: true, id: r.id });
                }
                else if (g.kind === 'home_care') {
                    for (const l of g.items) {
                        const r = await this.homeSvc.book(user, {
                            service_id: l.service_id, scheduled_at: body.scheduled_at,
                            address: body.address, contact: { name: user.full_name, phone: user.phone },
                            payment_method: l.payment_method || 'cash',
                            sessions_count: l.qty || 1,
                        });
                        results.push({ kind: 'home_care', ok: true, id: r.id });
                    }
                }
                else if (g.kind === 'doctor') {
                    for (const l of g.items) {
                        const meta = l.meta || {};
                        const docId = meta.doctor_id || l.service_id;
                        const doc = await this.providers.findOne({ account_id: docId });
                        if (doc && doc.verified !== true) {
                            throw new common_1.BadRequestException('provider_not_verified_by_admin');
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
                        results.push({ kind: 'doctor', ok: true, id: r.id });
                    }
                }
                else if (g.kind === 'pharmacy') {
                    const addr = body.delivery_address || body.address;
                    if (!addr?.lat || !addr?.lng) {
                        results.push({ kind: 'pharmacy', ok: false, error: 'delivery_address_with_lat_lng_required' });
                    }
                    else {
                        const items = g.items.map((l) => ({ medicine_id: l.service_id, qty: l.qty || 1, name_ar: l.name_ar, price: l.price }));
                        const r = await this.ordersSvc.create(user, { items, delivery_address: addr });
                        results.push({ kind: 'pharmacy', ok: true, id: r.id });
                    }
                }
                else {
                    results.push({ kind: g.kind, ok: false, error: 'unsupported_kind' });
                }
            }
            catch (e) {
                results.push({ kind: g.kind, ok: false, error: e?.message || e?.response?.message || 'failed' });
            }
        }
        const anyFailed = results.some(r => !r.ok);
        if (anyFailed) {
            for (const r of results) {
                if (!r.ok || !r.id)
                    continue;
                try {
                    await this.cancelBooking({ id: user.id, role: 'system' }, r.kind, r.id, 'checkout_rollback');
                    r.rolled_back = true;
                }
                catch { }
            }
            return { results, remaining_cart: await this.cart.get(user), rolled_back: true };
        }
        for (const r of results)
            if (r.ok)
                await this.cart.clear(user, r.kind);
        return { results, remaining_cart: await this.cart.get(user), rolled_back: false };
    }
};
exports.UnifiedBookingsService = UnifiedBookingsService;
exports.UnifiedBookingsService = UnifiedBookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('PharmacyOrder')),
    __param(2, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(3, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(4, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(5, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(6, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService,
        labs_service_1.LabsService,
        radiology_service_1.RadiologyOpsService,
        home_care_service_1.HomeCareSvc,
        appointments_service_1.AppointmentsService,
        slot_service_1.SlotService,
        orders_service_1.OrdersService,
        cart_module_1.CartService,
        workflow_engine_module_1.WorkflowEngineService,
        livekit_service_1.LiveKitService])
], UnifiedBookingsService);
let UnifiedBookingsController = class UnifiedBookingsController {
    constructor(svc) {
        this.svc = svc;
    }
    mine(u, q) { return this.svc.myTimeline(u, { state: q.state, kind: q.kind }); }
    create(u, b) { return this.svc.createConsultationContract(u, b); }
    cancelRoot(u, id, b) { return this.svc.cancelConsultationContract(u, id, b.reason); }
    rescheduleRoot(u, id, b) { return this.svc.rescheduleConsultationContract(u, id, b.new_slot_id); }
    callToken(u, id) { return this.svc.consultationCallToken(u, id); }
    one(u, k, id) { return this.svc.getOne(u, k, id); }
    cancel(u, k, id, b) { return this.svc.cancelBooking(u, k, id, b.reason || ''); }
    resched(u, k, id, b) { return this.svc.rescheduleBooking(u, k, id, b.scheduled_at, b.reason); }
    match(u, b) { return this.svc.smartMatch(u, b); }
    nursing(u, b) { return this.svc.nursingRadiusBroadcast(u, b); }
    checkout(u, b) { return this.svc.checkoutFromCart(u, b); }
};
exports.UnifiedBookingsController = UnifiedBookingsController;
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)(),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "cancelRoot", null);
__decorate([
    (0, common_1.Post)(':id/reschedule'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "rescheduleRoot", null);
__decorate([
    (0, common_1.Get)(':id/call-token'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "callToken", null);
__decorate([
    (0, common_1.Get)(':kind/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "one", null);
__decorate([
    (0, common_1.Post)(':kind/:id/cancel'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':kind/:id/reschedule'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "resched", null);
__decorate([
    (0, common_1.Post)('match'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "match", null);
__decorate([
    (0, common_1.Post)('nursing-broadcast'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "nursing", null);
__decorate([
    (0, common_1.Post)('checkout-cart'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UnifiedBookingsController.prototype, "checkout", null);
exports.UnifiedBookingsController = UnifiedBookingsController = __decorate([
    (0, common_1.Controller)('unified-bookings'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [UnifiedBookingsService])
], UnifiedBookingsController);
const labs_module_1 = require("../labs/labs.module");
const radiology_module_1 = require("../radiology/radiology.module");
const cart_module_2 = require("../cart/cart.module");
const home_care_module_1 = require("../home-care/home-care.module");
const care_module_1 = require("../care/care.module");
const orders_module_1 = require("../orders/orders.module");
let UnifiedBookingsModule = class UnifiedBookingsModule {
};
exports.UnifiedBookingsModule = UnifiedBookingsModule;
exports.UnifiedBookingsModule = UnifiedBookingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'PharmacyOrder', schema: pharmacy_schema_1.PharmacyOrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
            ]),
            labs_module_1.LabsModule,
            radiology_module_1.RadiologyModule,
            home_care_module_1.HomeCareModule,
            care_module_1.CareModule,
            orders_module_1.OrdersModule,
            cart_module_2.CartModule,
            workflow_engine_module_1.WorkflowEngineModule,
            livekit_module_1.LiveKitModule,
        ],
        controllers: [UnifiedBookingsController],
        providers: [UnifiedBookingsService],
    })
], UnifiedBookingsModule);
//# sourceMappingURL=unified-bookings.module.js.map