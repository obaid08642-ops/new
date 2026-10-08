import { PROVIDER_ROLES } from '../../common/enums';
/**
 * M2 — Home-care compatibility layer + nursing ops reference data + chat aliases.
 *
 * The apps call `/home-care/*` paths while the legacy module exposes `nursing/*`
 * with a different shape (and @Public — a security hole this module fixes by
 * requiring JWT on every compat endpoint). All writes persist state_history.
 */
import { Module, Controller, Get, Post, Body, Param, Query, UseGuards, Header, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser, Public, SelfService, Roles, hasEffectiveRole } from '../../common/auth.guard';
import { ChatModule } from '../chat/chat.module';
import { ChatService } from '../chat/chat.service';
import { HomeCareBookingSchema, HomeCareServiceSchema, CarePlanSchema } from '../../schemas/home-care.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { UserRole } from '../../common/enums';
import { CreateBookingDto, RespondDto, AssignDto, CheckInDto, GpsDto, VisitReportDto, CreateCarePlanDto, SetAvailabilityDto, InventoryRequestDto, PostMessageDto, PostLegacyDto, ProviderSendDto } from './home-care-compat.dto';

const ACTIVE_STATES = ['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CARE_STARTED'];

const NURSE_TYPES = ['home_care', 'nursing', 'nurse'];

@Controller('home-care')
@UseGuards(JwtAuthGuard)
export class HomeCareCompatController {
  constructor(
    @InjectModel('HomeCareBooking') private bookings: Model<any>,
    @InjectModel('HomeCareService') private services: Model<any>,
    @InjectModel('ProviderProfile') private profiles: Model<any>,
    @InjectModel('CarePlan') private carePlans: Model<any>,
    @Optional() private readonly emitter?: EventEmitter2,
    @Optional() @InjectConnection() private readonly conn?: Connection,
  ) {}

  /** Resolve a saved-address id to the caller's own address (never another patient's). */
  private async savedAddress(userId: string, addressId: string) {
    const profile: any = await this.conn?.collection('patient_profiles').findOne({ user_id: { $eq: userId } }, { projection: { addresses: 1 } });
    const a: any = (profile?.addresses || []).find((x: any) => x?.id === addressId);
    if (!a) throw new BadRequestException('address_not_found');
    return { address: a.line1 || a.street || undefined, city: a.city || undefined, district: a.district || undefined, lat: a.lat, lng: a.lng };
  }

  // ---- Catalog ----
  @Public()
  @Get('services') servicesList(@Query() q: any) {
    // Patients only see services that passed medical review (same rule as /nursing/catalog).
    const filter: any = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
    if (q?.category) filter.category = q.category;
    return this.services.find(filter, { _id: 0, __v: 0 }).lean();
  }

  @Public()
  @Get('services/:id') async serviceOne(@Param('id') id: string) {
    const svc = await this.services.findOne({ id, ...{ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' } }, { _id: 0, __v: 0 }).lean();
    if (!svc) throw new NotFoundException('service not found');
    return svc;
  }

  @Public()
  @Get('packages') async packagesList() {
    return this.services.find({ ...{ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, is_package: true }, { _id: 0, __v: 0 }).lean();
  }

  @Public()
  @Get('providers') async providers(@Query() q: any) {
    // Approved home-care providers; `type` is the chosen service id (patient-app nursing/service-details).
    const filter: any = { type: { $in: NURSE_TYPES }, status: 'active', public_eligibility: true, medical_review_status: 'approved', account_id: { $exists: true, $ne: null }, is_deleted: { $ne: true } };
    const serviceId = typeof q?.type === 'string' && q.type ? q.type : null;
    // query values are coerced to plain strings and matched with $eq (never operator objects)
    const svc: any = serviceId ? await this.services.findOne({ id: { $eq: String(serviceId) } }).lean() : null;
    if (serviceId) filter['nursing_services.key'] = { $eq: String(serviceId) };
    const gender = typeof q?.gender === 'string' ? q.gender : '';
    if (gender && gender !== 'any') filter.gender = { $eq: gender };
    if (typeof q?.search === 'string' && q.search.trim()) {
      const rx = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name_ar: rx }, { name_en: rx }, { full_name: rx }];
    }
    const rows: any[] = await this.profiles.find(filter).limit(50).lean();
    const sort = String(q?.sort || '');
    const list = rows.map((p) => this.nurseView(p, svc));
    if (sort === 'rating') list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return list;
  }

  /** The bookable nurse: `id` is the provider account id (bookings and the nurse's job queue key on it). */
  private nurseView(p: any, svc?: any) {
    return {
      id: p.account_id, profile_id: p.id,
      name_ar: p.name_ar || p.full_name || p.name_en, name: p.name_ar || p.full_name || p.name_en, name_en: p.name_en,
      gender: p.gender || null, degree: p.qualification || p.degree || null,
      facility_name: p.facility_name || p.organization_name || '', facility: p.facility_name || p.organization_name || '',
      rating: p.rating_count > 0 ? p.rating_avg : null, reviews_count: p.rating_count || 0, reviews: [],
      years_experience: p.years_experience || null, profile_photo: p.profile_photo || null,
      // the booking is charged at the catalog service price (home-care.service book())
      price: svc ? Number(svc.price) : null, service_id: svc?.id || null,
      available_now: Boolean(p.availability?.accepting ?? true),
      services: (p.nursing_services || []).map((x: any) => x.key),
    };
  }

  @Public()
  @Get('providers/:id') async provider(@Param('id') id: string, @Query('serviceId') serviceId?: string) {
    const key = String(id);
    const p = await this.profiles.findOne({ $or: [{ account_id: { $eq: key } }, { id: { $eq: key } }], type: { $in: NURSE_TYPES }, status: 'active', public_eligibility: true }).lean();
    if (!p) throw new NotFoundException('provider not found');
    const svc: any = typeof serviceId === 'string' && serviceId ? await this.services.findOne({ id: { $eq: serviceId } }).lean() : null;
    return this.nurseView(p, svc);
  }

  // ---- Bookings ----
  private isAdmin(u: any) { return u?.role === 'admin' || u?.role === 'super_admin'; }
  private isNursingProvider(u: any) {
    // role or provider_type (provider-auth tokens: role 'provider', provider_type 'home_care')
    return hasEffectiveRole(u, 'nurse', 'nursing', 'home_care');
  }
  private async getBookingForAccess(u: any, id: string, allowUnassignedProvider = false) {
    const b: any = await this.bookings.findOne({ id: { $eq: id } });
    if (!b) throw new NotFoundException('booking not found');
    if (this.isAdmin(u)) return b;
    if (u?.role === 'patient' && b.patient_id === u.id) return b;
    if (this.isNursingProvider(u) && (b.provider_id === u.id || (allowUnassignedProvider && !b.provider_id))) return b;
    throw new ForbiddenException('booking_access_denied');
  }

  @SelfService()
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT')
  @Post('bookings') async createBooking(@CurrentUser() u: any, @Body() body: CreateBookingDto) {
    if (u?.role !== 'patient') throw new ForbiddenException('patient_only');
    if (!body?.service_id) throw new BadRequestException('service_id is required');
    if (!body?.scheduled_at) throw new BadRequestException('scheduled_at is required');
    const svc: any = await this.services.findOne({ id: { $eq: body.service_id }, active: true }).lean();
    if (!svc) throw new NotFoundException('service not found');
    const address = body.address_id ? await this.savedAddress(u.id, body.address_id) : body.address;
    const doc = await this.bookings.create({
      patient_id: u.id,
      service_id: svc?.id || body.service_id,
      service_name_ar: svc?.name_ar || body.service_name_ar,
      duration: svc.duration || 'hour',
      total: svc.price,
      total_price: svc.price,
      scheduled_at: new Date(body.scheduled_at),
      address,
      notes: body.notes?.trim() || undefined,
      payment_method: body.payment_method,
      provider_id: undefined,
      state: 'NEW_REQUEST',
      state_history: [{ state: 'NEW_REQUEST', at: new Date(), by: u.id }],
    });
    try { this.emitter?.emit('homecare.booking_created', { booking_id: doc.id, patient_id: u.id }); } catch {}
    return doc.toObject();
  }

  @Header('Deprecation', 'true')
  @Header('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT')
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

  @SelfService()
  @Post('bookings/:id/respond') respond(@CurrentUser() u: any, @Param('id') id: string, @Body() body: RespondDto) {
    const accept = body?.accept === true || body?.action === 'accept';
    // NursingBookingState has no ACCEPTED/REJECTED — accepting nurse takes the
    // job (PROVIDER_ASSIGNED + provider_id), declining cancels the request.
    return this.transition(u, id, accept ? 'PROVIDER_ASSIGNED' : 'CANCELLED', {
      fields: accept ? { provider_id: u.id } : {},
      meta: { reason: body?.reason },
    });
  }

  @SelfService()
  @Post('bookings/:id/assign') async assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: AssignDto) {
    if (!this.isAdmin(u)) throw new ForbiddenException('admin_only');
    // Facility dashboard assigns by nurse_* fields; map onto provider identity.
    const providerId = body?.provider_id || (body as any)?.nurse_id;
    const providerName = body?.provider_name || (body as any)?.nurse_name;
    if (!providerId) throw new BadRequestException('provider_id is required');
    await this.getBookingForAccess(u, id);
    return this.transition(u, id, 'PROVIDER_ASSIGNED', { fields: { provider_id: providerId, provider_name: providerName } });
  }

  @SelfService()
  @Post('bookings/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string, @Body() body: CheckInDto) {
    return this.transition(u, id, 'ARRIVED', { fields: { 'timers.arrived_at': new Date(), checklist: body?.checklist } });
  }

  @SelfService()
  @Post('bookings/:id/gps') async gps(@CurrentUser() u: any, @Param('id') id: string, @Body() body: GpsDto) {
    if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number') throw new BadRequestException('lat/lng required');
    const b = await this.getBookingForAccess(u, id);
    if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id)) throw new ForbiddenException('assigned_provider_required');
    await this.bookings.updateOne({ id, ...(this.isAdmin(u) ? {} : { provider_id: u.id }) }, { $set: { 'gps_tracking.current_lat': body.lat, 'gps_tracking.current_lng': body.lng, 'gps_tracking.last_updated': new Date() } });
    return { ok: true };
  }

  @SelfService()
  @Post('bookings/:id/visit-report') visitReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: VisitReportDto) {
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

  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.DOCTOR, UserRole.ADMIN)
  @Post('care-plans/:patientId') async createCarePlan(@CurrentUser() u: any, @Param('patientId') patientId: string, @Body() body: CreateCarePlanDto) {
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
      doctor_id: hasEffectiveRole(u, 'doctor') ? u.id : undefined,
      nurse_id: hasEffectiveRole(u, 'nurse', 'nursing', 'home_care') ? u.id : undefined,
      title: String(body.title).slice(0, 200),
      description: body?.description ? String(body.description).slice(0, 2000) : undefined,
      tasks: tasks.map((t: string) => t.slice(0, 300)),
      status: 'active',
    });
  }

  @SelfService()
  @Post('provider/availability') async setAvailability(@CurrentUser() u: any, @Body() body: SetAvailabilityDto) {
    if (!this.isAdmin(u) && !this.isNursingProvider(u)) throw new ForbiddenException('provider_role_required');
    await this.profiles.updateOne({ id: u.id, ...(this.isAdmin(u) ? {} : { provider_type: { $in: ['nursing', 'nurse'] } }) }, { $set: { 'availability.online': !!body?.online, 'availability.available_now': !!body?.available_now, 'availability.updated_at': new Date() } });
    return { ok: true };
  }

  @Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
  @Post('inventory/request') async inventoryRequest(@CurrentUser() u: any, @Body() body: InventoryRequestDto) {
    if (!Array.isArray(body?.items) || !body.items.length) throw new BadRequestException('items required');
    if (body.items.length > 100) throw new BadRequestException('too_many_items');
    if (!body?.booking_id) throw new BadRequestException('booking_id is required');
    const b = await this.getBookingForAccess(u, body.booking_id);
    if (!this.isAdmin(u) && (u?.role === 'patient' || !this.isNursingProvider(u) || b.provider_id !== u.id)) throw new ForbiddenException('assigned_provider_required');
    // R4-2: rebuild each item with static keys/coerced scalars — the raw
    // caller array (provider-app sends {name, qty, unit}) never enters the $push.
    const items = body.items.map((it: any) => ({
      name: String(it?.name ?? it?.nameEn ?? '').slice(0, 200),
      qty: Math.min(Math.max(Number(it?.qty) || 0, 0), 10000),
      unit: String(it?.unit ?? 'pcs').slice(0, 20),
    }));
    await this.bookings.updateOne(
      { id: { $eq: body.booking_id }, ...(this.isAdmin(u) ? {} : { provider_id: { $eq: u.id } }) },
      { $push: { supply_requests: { id: uuid(), items, at: new Date(), by: u.id, state: 'requested' } } },
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
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('checklist') checklist(@Query('category') category?: string) {
    return { category: category || 'default', items: NURSING_CHECKLISTS[category || 'default'] || NURSING_CHECKLISTS.default };
  }
  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('supplies') supplies() { return { items: NURSING_SUPPLIES }; }
}

// ---- Chat aliases (apps use 3 different conventions; canonical is /chat/threads) ----

@Controller()
@SelfService()
@UseGuards(JwtAuthGuard)
export class ChatAliasController {
  constructor(private readonly chat: ChatService, @InjectConnection() private readonly conn: Connection) {}

  @Get('chats/provider') providerThreads(@CurrentUser() u: any, @Query() q: any) {
    return this.chat.myThreads(u.id, parseInt(q?.page || '1', 10) || 1, parseInt(q?.limit || '30', 10) || 30);
  }

  @Get('chat/channels') channels(@CurrentUser() u: any, @Query() q: any) {
    return this.chat.myThreads(u.id, 1, 50);
  }

  @Get('chats/:id/messages') getMessages(@CurrentUser() u: any, @Param('id') id: string, @Query() q: any) {
    return this.chat.getMessages(id, u.id, { before: q?.before, limit: parseInt(q?.limit || '50', 10) || 50 });
  }

  @Post('chats/:id/messages') postMessage(@CurrentUser() u: any, @Param('id') id: string, @Body() body: PostMessageDto) {
    return this.chat.sendMessage(id, u.id, u.role || 'user', { type: 'text', body: body?.content || body?.text || body?.body });
  }

  // legacy shape: POST /chat/messages/:threadId {text}
  @Post('chat/messages/:threadId') postLegacy(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: PostLegacyDto) {
    return this.chat.sendMessage(threadId, u.id, u.role || 'user', { type: 'text', body: body?.text || body?.content });
  }

  // provider quick-send: POST /provider/chat/send {thread_id, text}
  // Also accepts {appointment_id, message} from the doctor dashboard chat sheet.
  @Post('provider/chat/send') providerSend(@CurrentUser() u: any, @Body() body: ProviderSendDto) {
    return this.providerQuickSend(u, body);
  }

  /** The doctor's pre-visit chat for an appointment is the appointment's booking thread
   *  (ChatService enforces that the caller is the booking's patient or provider). */
  private async appointmentThreadId(u: any, appointmentId: string): Promise<string> {
    const thread: any = await this.chat.getOrCreateBookingThread('consultation', String(appointmentId), String(u.id));
    return thread?.id;
  }

  // doctor PreVisitChatScreen: history of the appointment's conversation
  @Get('provider/chat/appointment/:id') async appointmentChat(@CurrentUser() u: any, @Param('id') id: string) {
    const threadId = await this.appointmentThreadId(u, id);
    const { messages } = await this.chat.getMessages(threadId, u.id, { limit: 100 });
    return { thread_id: threadId, messages: [...messages].reverse() };
  }

  private async providerQuickSend(u: any, body: ProviderSendDto) {
    let threadId = (body as any)?.thread_id || (body as any)?.threadId;
    const appointmentId = (body as any)?.appointment_id;
    if (!threadId && appointmentId) threadId = await this.appointmentThreadId(u, String(appointmentId));
    if (!threadId) throw new BadRequestException('thread_id is required');
    const text = (body as any)?.message || body?.text || body?.content;
    return this.chat.sendMessage(threadId, u.id, u.role || 'provider', { type: 'text', body: text });
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
