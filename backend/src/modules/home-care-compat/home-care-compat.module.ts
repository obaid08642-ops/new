/**
 * M2 — Home-care compatibility layer + nursing ops reference data + chat aliases.
 *
 * The apps call `/home-care/*` paths while the legacy module exposes `nursing/*`
 * with a different shape (and @Public — a security hole this module fixes by
 * requiring JWT on every compat endpoint). All writes persist state_history.
 */
import { Module, Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { ChatModule } from '../chat/chat.module';
import { ChatService } from '../chat/chat.service';
import { HomeCareBookingSchema, HomeCareServiceSchema, CarePlanSchema } from '../../schemas/home-care.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';

const ACTIVE_STATES = ['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CARE_STARTED'];

@Controller('home-care')
@UseGuards(JwtAuthGuard)
export class HomeCareCompatController {
  constructor(
    @InjectModel('HomeCareBooking') private bookings: Model<any>,
    @InjectModel('HomeCareService') private services: Model<any>,
    @InjectModel('ProviderProfile') private profiles: Model<any>,
    @InjectModel('CarePlan') private carePlans: Model<any>,
    @Optional() private readonly emitter?: EventEmitter2,
  ) {}

  // ---- Catalog ----
  @Public()
  @Get('services') servicesList(@Query() q: any) {
    const filter: any = { active: true };
    if (q?.category) filter.category = q.category;
    return this.services.find(filter, { _id: 0, __v: 0 }).lean();
  }

  @Public()
  @Get('services/:id') async serviceOne(@Param('id') id: string) {
    const svc = await this.services.findOne({ id, active: true }, { _id: 0, __v: 0 }).lean();
    if (!svc) throw new NotFoundException('service not found');
    return svc;
  }

  @Get('providers') async providers(@Query() q: any) {
    const filter: any = { provider_type: 'nursing', active: true, approval_status: 'approved' };
    if (q?.city) filter['address.city'] = q.city;
    return this.profiles.find(filter, {
      _id: 0, id: 1, full_name: 1, provider_type: 1, rating_avg: 1, rating_count: 1, address: 1, specialties: 1, years_experience: 1,
    }).limit(50).lean();
  }

  @Get('providers/:id') async provider(@Param('id') id: string) {
    const p = await this.profiles.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!p) throw new NotFoundException('provider not found');
    return p;
  }

  // ---- Bookings ----
  private isAdmin(u: any) { return u?.role === 'admin' || u?.role === 'super_admin'; }
  private isNursingProvider(u: any) {
    return ['nurse', 'nursing', 'provider'].includes(String(u?.role || '').toLowerCase())
      && ['nursing', 'nurse', 'provider'].includes(String(u?.provider_type || u?.providerType || u?.role || '').toLowerCase());
  }
  private async getBookingForAccess(u: any, id: string, allowUnassignedProvider = false) {
    const b: any = await this.bookings.findOne({ id });
    if (!b) throw new NotFoundException('booking not found');
    if (this.isAdmin(u)) return b;
    if (u?.role === 'patient' && b.patient_id === u.id) return b;
    if (this.isNursingProvider(u) && (b.provider_id === u.id || (allowUnassignedProvider && !b.provider_id))) return b;
    throw new ForbiddenException('booking_access_denied');
  }

  @Post('bookings')
  @RequireIdempotency()
  async createBooking(@CurrentUser() u: any, @Body() body: any) {
    if (u?.role !== 'patient') throw new ForbiddenException('patient_only');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('invalid_booking_payload');
    if (typeof body.service_id !== 'string' || !body.service_id.trim() || body.service_id.length > 160) throw new BadRequestException('service_id_required');
    if (typeof body.scheduled_at !== 'string') throw new BadRequestException('scheduled_at_required');
    const scheduledAt = new Date(body.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 5 * 60_000) throw new BadRequestException('scheduled_at_required');
    const sessionsCount = body.sessions_count === undefined ? 1 : Number(body.sessions_count);
    if (!Number.isInteger(sessionsCount) || sessionsCount < 1 || sessionsCount > 60) throw new BadRequestException('invalid_sessions_count');
    const paymentMethod = ['cash', 'card', 'insurance'].includes(body.payment_method) ? body.payment_method : 'cash';
    const svc: any = await this.services.findOne({ id: body.service_id, active: true }).lean();
    if (!svc) throw new NotFoundException('service_not_found');
    if (paymentMethod === 'cash' && svc.cash_availability === false) throw new BadRequestException('cash_not_available');
    if (paymentMethod === 'insurance' && svc.insurance_availability === false) throw new BadRequestException('insurance_not_available');
    let provider: any = null;
    if (body.provider_id !== undefined) {
      if (typeof body.provider_id !== 'string' || !body.provider_id.trim() || body.provider_id.length > 200) throw new BadRequestException('invalid_provider_id');
      provider = await this.profiles.findOne({ id: body.provider_id, provider_type: 'nursing', active: true, approval_status: 'approved' }).lean();
      if (!provider) throw new NotFoundException('provider_not_available');
    }
    const rawAddress = body.address;
    const address = typeof rawAddress === 'string' && rawAddress.trim() ? { address: rawAddress.trim() } : rawAddress && typeof rawAddress === 'object' && !Array.isArray(rawAddress) ? {
      ...(typeof rawAddress.address === 'string' ? { address: rawAddress.address.slice(0, 500) } : {}),
      ...(typeof rawAddress.city === 'string' ? { city: rawAddress.city.slice(0, 100) } : {}),
      ...(typeof rawAddress.district === 'string' ? { district: rawAddress.district.slice(0, 100) } : {}),
      ...(typeof rawAddress.lat === 'number' && Number.isFinite(rawAddress.lat) && Math.abs(rawAddress.lat) <= 90 ? { lat: rawAddress.lat } : {}),
      ...(typeof rawAddress.lng === 'number' && Number.isFinite(rawAddress.lng) && Math.abs(rawAddress.lng) <= 180 ? { lng: rawAddress.lng } : {}),
    } : null;
    if (!address || !address.address) throw new BadRequestException('address_required');
    const state = provider ? 'PROVIDER_ASSIGNED' : 'NEW_REQUEST';
    const total = Number(svc.price || 0) * sessionsCount;
    const doc = await this.bookings.create({
      patient_id: u.id,
      service_id: svc.id,
      service_name_ar: svc.name_ar,
      service_name_en: svc.name_en,
      duration: svc.duration || 'hour',
      sessions_count: sessionsCount,
      total,
      total_price: total,
      service_fee: total,
      scheduled_at: scheduledAt,
      address,
      payment_method: paymentMethod,
      provider_id: provider?.id,
      provider_name: provider?.full_name,
      state,
      state_history: [{ state, at: new Date(), by: u.id }],
    });
    try { this.emitter?.emit('homecare.booking_created', { booking_id: doc.id, patient_id: u.id }); } catch {}
    return doc.toObject();
  }

  @Get('bookings/my') myBookings(@CurrentUser() u: any, @Query() q: any) {
    const filter: any = u.role === 'patient' ? { patient_id: u.id } : { provider_id: u.id };
    return this.bookings.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
  }

  // Provider app: GET /home-care/bookings/nursing/all
  @Get('bookings/nursing/all') nursingQueue(@CurrentUser() u: any, @Query() q: any) {
    if (!this.isAdmin(u) && !this.isNursingProvider(u)) throw new ForbiddenException('provider_role_required');
    const filter: any = {};
    const status = q?.status || 'active';
    if (status === 'active') filter.state = { $in: ACTIVE_STATES };
    else if (status === 'incoming') filter.state = 'NEW_REQUEST';
    else if (status === 'completed') filter.state = { $in: ['COMPLETED', 'CANCELLED'] };
    // unassigned requests are visible to all nurses; assigned ones only to their provider
    filter.$or = [{ provider_id: u.id }, { provider_id: { $exists: false } }, { provider_id: null }];
    return this.bookings.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
  }

  private async transition(u: any, id: string, newState: string, extra: Record<string, any> = {}) {
    const allowUnassigned = newState === 'PROVIDER_ASSIGNED' || newState === 'CANCELLED';
    const b = await this.getBookingForAccess(u, id, allowUnassigned);
    if (u?.role === 'patient') throw new ForbiddenException('provider_transition_required');
    if (!this.isAdmin(u) && !this.isNursingProvider(u)) throw new ForbiddenException('provider_role_required');
    const allowed: Record<string, string[]> = {
      PROVIDER_ASSIGNED: ['NEW_REQUEST'],
      ARRIVED: ['PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE'],
      CARE_IN_PROGRESS: ['ARRIVED'],
      COMPLETED: ['CARE_IN_PROGRESS', 'ARRIVED'],
      CANCELLED: ['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CARE_IN_PROGRESS'],
    };
    if (!this.isAdmin(u) && allowed[newState] && !allowed[newState].includes(String(b.state))) {
      throw new BadRequestException('invalid_transition');
    }
    b.state = newState;
    b.state_history = [...(b.state_history || []), { state: newState, at: new Date(), by: u.id, ...extra.meta }];
    Object.assign(b, extra.fields || {});
    b.markModified('state_history');
    await b.save();
    // Fan out so the patient gets notified at every step of the visit
    try { this.emitter?.emit('homecare.booking_state_changed', { booking_id: id, patient_id: b.patient_id, state: newState, provider_id: b.provider_id }); } catch {}
    return { ok: true, id, state: newState };
  }

  @Post('bookings/:id/respond') respond(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    const accept = body?.accept === true || body?.action === 'accept';
    // NursingBookingState has no ACCEPTED/REJECTED — accepting nurse takes the
    // job (PROVIDER_ASSIGNED + provider_id), declining cancels the request.
    return this.transition(u, id, accept ? 'PROVIDER_ASSIGNED' : 'CANCELLED', {
      fields: accept ? { provider_id: u.id } : {},
      meta: { reason: body?.reason },
    });
  }

  @Post('bookings/:id/assign') async assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    if (!this.isAdmin(u)) throw new ForbiddenException('admin_only');
    if (!body?.provider_id) throw new BadRequestException('provider_id is required');
    await this.getBookingForAccess(u, id);
    return this.transition(u, id, 'PROVIDER_ASSIGNED', { fields: { provider_id: body.provider_id, provider_name: body.provider_name } });
  }

  @Post('bookings/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.transition(u, id, 'ARRIVED', { fields: { 'timers.arrived_at': new Date(), checklist: body?.checklist } });
  }

  @Post('bookings/:id/gps') async gps(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number') throw new BadRequestException('lat/lng required');
    const b = await this.getBookingForAccess(u, id);
    if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id)) throw new ForbiddenException('assigned_provider_required');
    await this.bookings.updateOne({ id, ...(this.isAdmin(u) ? {} : { provider_id: u.id }) }, { $set: { 'gps_tracking.current_lat': body.lat, 'gps_tracking.current_lng': body.lng, 'gps_tracking.last_updated': new Date() } });
    return { ok: true };
  }

  @Post('bookings/:id/visit-report') visitReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.transition(u, id, body?.complete ? 'COMPLETED' : 'CARE_IN_PROGRESS', {
      fields: {
        vitals: body?.vitals, clinical_notes: body?.clinical_notes,
        procedure_notes: body?.procedure_notes, medication_administered: body?.medication_administered,
        consumables_used: body?.consumables_used, recommendations: body?.recommendations,
        follow_up_instructions: body?.follow_up_instructions,
        ...(body?.complete ? { 'timers.completed_at': new Date() } : { 'timers.care_started_at': new Date() }),
      },
    });
  }

  // ---- Care Plans (nurse/doctor-authored task plans for a patient) ----
  @Get('care-plans/:patientId') async listCarePlans(@CurrentUser() u: any, @Param('patientId') patientId: string) {
    if (this.isAdmin(u) || (u?.role === 'patient' && u.id === patientId)) return this.carePlans.find({ patient_id: patientId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    if (this.isNursingProvider(u)) return this.carePlans.find({ patient_id: patientId, $or: [{ nurse_id: u.id }, { doctor_id: u.id }] }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    throw new ForbiddenException('care_plan_access_denied');
  }

  @Post('care-plans/:patientId') async createCarePlan(@CurrentUser() u: any, @Param('patientId') patientId: string, @Body() body: any) {
    if (!this.isAdmin(u) && !this.isNursingProvider(u) && !['doctor', 'hospital'].includes(String(u?.role || '').toLowerCase())) throw new ForbiddenException('role_not_allowed');
    if (!this.isAdmin(u) && !['doctor', 'hospital'].includes(String(u?.role || '').toLowerCase())) {
      const assigned = await this.bookings.findOne({ patient_id: patientId, provider_id: u.id });
      if (!assigned) throw new ForbiddenException('patient_not_assigned');
    }
    if (!body?.title || typeof body.title !== 'string') throw new BadRequestException('title is required');
    const tasks = Array.isArray(body?.tasks) ? body.tasks.filter((t: any) => typeof t === 'string' && t.trim()).slice(0, 50) : [];
    return this.carePlans.create({
      id: uuid(),
      patient_id: patientId,
      doctor_id: u.role === 'doctor' ? u.id : undefined,
      nurse_id: u.role === 'nurse' ? u.id : undefined,
      title: String(body.title).slice(0, 200),
      description: body?.description ? String(body.description).slice(0, 2000) : undefined,
      tasks: tasks.map((t: string) => t.slice(0, 300)),
      status: 'active',
    });
  }

  @Post('provider/availability') async setAvailability(@CurrentUser() u: any, @Body() body: any) {
    if (!this.isAdmin(u) && !this.isNursingProvider(u)) throw new ForbiddenException('provider_role_required');
    await this.profiles.updateOne({ id: u.id, ...(this.isAdmin(u) ? {} : { provider_type: { $in: ['nursing', 'nurse'] } }) }, { $set: { 'availability.online': !!body?.online, 'availability.available_now': !!body?.available_now, 'availability.updated_at': new Date() } });
    return { ok: true };
  }

  @Post('inventory/request') async inventoryRequest(@CurrentUser() u: any, @Body() body: any) {
    if (!Array.isArray(body?.items) || !body.items.length) throw new BadRequestException('items required');
    if (!body?.booking_id) throw new BadRequestException('booking_id is required');
    const b = await this.getBookingForAccess(u, body.booking_id);
    if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id)) throw new ForbiddenException('assigned_provider_required');
    await this.bookings.updateOne(
      { id: body.booking_id, ...(this.isAdmin(u) ? {} : { provider_id: u.id }) },
      { $push: { supply_requests: { id: uuid(), items: body.items, at: new Date(), by: u.id, state: 'requested' } } },
    );
    return { ok: true, state: 'requested' };
  }
}

// ---- Nursing ops reference data (real clinical checklists/supplies) ----

const NURSING_CHECKLISTS: Record<string, any[]> = {
  default: [
    { key: 'verify_identity', title_ar: 'التحقق من هوية المريض', required: true },
    { key: 'vitals_baseline', title_ar: 'قياس العلامات الحيوية الأساسية', required: true },
    { key: 'meds_check', title_ar: 'مراجعة الأدوية والحساسية', required: true },
    { key: 'consent', title_ar: 'أخذ الموافقة المستنيرة', required: true },
    { key: 'sterile_field', title_ar: 'تجهيز حقل معقم', required: false },
    { key: 'documentation', title_ar: 'توثيق الإجراء في التقرير', required: true },
  ],
  wound: [
    { key: 'wound_assessment', title_ar: 'تقييم الجرح (حجم/عمق/إفرازات)', required: true },
    { key: 'sterile_technique', title_ar: 'تقنية التعقيم الكاملة', required: true },
    { key: 'dressing_change', title_ar: 'تغيير الضماد وفق البروتوكول', required: true },
    { key: 'photo_documentation', title_ar: 'توثيق مصور بموافقة المريض', required: false },
  ],
  iv: [
    { key: 'vein_assessment', title_ar: 'تقييم الوريد المناسب', required: true },
    { key: 'line_check', title_ar: 'فحص الخط الوريدي وسلامته', required: true },
    { key: 'infusion_monitoring', title_ar: 'مراقبة التسريب والمضاعفات', required: true },
  ],
};

const NURSING_SUPPLIES: any[] = [
  { id: 'sup-001', name_ar: 'قفازات معقمة (علبة)', category: 'consumable', unit: 'علبة' },
  { id: 'sup-002', name_ar: 'شاش معقم', category: 'consumable', unit: 'عبوة' },
  { id: 'sup-003', name_ar: 'محلول ملحي 0.9%', category: 'consumable', unit: 'زجاجة' },
  { id: 'sup-004', name_ar: 'قسطرة وريدية 20G', category: 'consumable', unit: 'قطعة' },
  { id: 'sup-005', name_ar: 'ضمادات لاصقة متنوعة', category: 'consumable', unit: 'عبوة' },
  { id: 'sup-006', name_ar: 'مطهر كحولي 70%', category: 'consumable', unit: 'زجاجة' },
  { id: 'sup-007', name_ar: 'أنبوب سحب عينات', category: 'lab', unit: 'قطعة' },
  { id: 'sup-008', name_ar: 'جهاز قياس سكر + شرائح', category: 'device', unit: 'عدة' },
  { id: 'sup-009', name_ar: 'حاقنات 3ml/5ml', category: 'consumable', unit: 'علبة' },
  { id: 'sup-010', name_ar: 'أكياس نفايات طبية', category: 'consumable', unit: 'رول' },
];

@Controller('provider/nursing')
@UseGuards(JwtAuthGuard)
export class NursingOpsController {
  @Get('checklist') checklist(@Query('category') category?: string) {
    return { category: category || 'default', items: NURSING_CHECKLISTS[category || 'default'] || NURSING_CHECKLISTS.default };
  }
  @Get('supplies') supplies() { return { items: NURSING_SUPPLIES }; }
}

// ---- Chat aliases (apps use 3 different conventions; canonical is /chat/threads) ----

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatAliasController {
  constructor(private readonly chat: ChatService) {}

  @Get('chats/provider') providerThreads(@CurrentUser() u: any, @Query() q: any) {
    return this.chat.myThreads(u.id, parseInt(q?.page || '1', 10) || 1, parseInt(q?.limit || '30', 10) || 30);
  }

  @Get('chat/channels') channels(@CurrentUser() u: any, @Query() q: any) {
    return this.chat.myThreads(u.id, 1, 50);
  }

  @Get('chats/:id/messages') getMessages(@CurrentUser() u: any, @Param('id') id: string, @Query() q: any) {
    return this.chat.getMessages(id, u.id, { before: q?.before, limit: parseInt(q?.limit || '50', 10) || 50 });
  }

  @Post('chats/:id/messages') postMessage(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.chat.sendMessage(id, u.id, u.role || 'user', { type: 'text', body: body?.content || body?.text || body?.body });
  }

  // legacy shape: POST /chat/messages/:threadId {text}
  @Post('chat/messages/:threadId') postLegacy(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: any) {
    return this.chat.sendMessage(threadId, u.id, u.role || 'user', { type: 'text', body: body?.text || body?.content });
  }

  // provider quick-send: POST /provider/chat/send {thread_id, text}
  @Post('provider/chat/send') providerSend(@CurrentUser() u: any, @Body() body: any) {
    const threadId = body?.thread_id || body?.threadId;
    if (!threadId) throw new BadRequestException('thread_id is required');
    return this.chat.sendMessage(threadId, u.id, u.role || 'provider', { type: 'text', body: body?.text || body?.content });
  }
}

@Module({
  imports: [
    ChatModule,
    MongooseModule.forFeature([
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: 'HomeCareService', schema: HomeCareServiceSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'CarePlan', schema: CarePlanSchema },
    ]),
  ],
  controllers: [HomeCareCompatController, NursingOpsController, ChatAliasController],
})
export class HomeCareCompatModule {}
