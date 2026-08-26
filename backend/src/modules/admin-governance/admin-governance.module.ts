import { Module, Controller, Get, Post, Put, Param, Query, Body, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole, ServiceState } from '../../common/enums';
import { Order, OrderDocument, OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking, HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { SystemEvent, SystemEventSchema } from '../events/system-event.schema';
import { toUniversal, domainStatesFor, WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { B2BRequestSchema } from '../../schemas/b2b-request.schema';
import { B2BController } from './b2b.controller';
import { SystemConfigController } from './system-config.controller';

/**
 * Admin Governance — ALL queries derive from the universal lifecycle.
 * Every booking flavor (pharmacy, lab, radiology, nursing, consultation) is
 * normalized via `toUniversal()` before counting/scoring.
 */
@Injectable()
export class AdminGovernanceService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('User') private users: Model<UserDocument>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('SystemEvent') private events: Model<any>,
  ) {}

  // ---- internal helpers --------------------------------------------------
  private scoreBucket(items: Array<{ kind: any; state: string; createdAt?: Date; state_history?: any[]; scheduled_at?: Date }>) {
    let total = items.length, completed = 0, cancelled = 0, accepted = 0, delayed = 0;
    let sum_response_min = 0, response_count = 0;
    for (const it of items) {
      const us = toUniversal(it.kind, it.state);
      if (us === ServiceState.COMPLETED) completed++;
      if (us === ServiceState.CANCELLED) cancelled++;
      const acceptedEvt = (it.state_history || []).find((s: any) => [ServiceState.ASSIGNED, ServiceState.CONFIRMED].includes(toUniversal(it.kind, s.to)));
      if (acceptedEvt) {
        accepted++;
        const ms = new Date(acceptedEvt.at).getTime() - new Date(it.createdAt as any).getTime();
        sum_response_min += ms / 60000; response_count++;
      }
      if (it.scheduled_at) {
        const lastComplete = (it.state_history || []).slice().reverse().find((s: any) => toUniversal(it.kind, s.to) === ServiceState.COMPLETED);
        if (lastComplete && new Date(lastComplete.at).getTime() > new Date(it.scheduled_at).getTime() + 60 * 60000) delayed++;
      }
    }
    const acceptance_rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellation_rate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const delay_rate = total > 0 ? Math.round((delayed / total) * 100) : 0;
    const avg_response_min = response_count > 0 ? Math.round(sum_response_min / response_count) : 0;
    const score = Math.round(completion_rate * 0.5 + acceptance_rate * 0.2 + Math.max(0, 100 - avg_response_min) * 0.2 + Math.max(0, 100 - delay_rate * 5) * 0.1);
    return { total, accepted, completed, cancelled, delayed, acceptance_rate, completion_rate, cancellation_rate, delay_rate, avg_response_min, score };
  }

  /** Engine-driven provider performance for ALL provider types. */
  async providersPerformance(filter: { type?: string; limit?: number } = {}) {
    const q: any = { status: { $ne: 'suspended' } };
    if (filter.type) q.type = filter.type;
    const profiles = await this.providers.find(q, { _id: 0, __v: 0, license_documents: 0 }).limit(Math.min(filter.limit || 100, 200)).lean();
    const since = new Date(Date.now() - 60 * 86400000);
    const out: any[] = [];
    for (const p of profiles) {
      let items: any[] = [];
      let kind: any = 'pharmacy';
      if (p.type === 'pharmacy') {
        kind = 'pharmacy';
        items = await this.orders.find({ pharmacy_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
      } else if (p.type === 'lab') {
        kind = 'lab';
        items = await this.labs.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
      } else if (p.type === 'radiology') {
        kind = 'radiology';
        items = await this.rads.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
      } else if (p.type === 'home_care') {
        kind = 'nursing';
        items = await this.home.find({ account_id: p.user_id, createdAt: { $gte: since } }, { state: 1, state_history: 1, createdAt: 1, scheduled_at: 1 }).lean();
      } else if (p.type === 'doctor' || p.type === 'clinic' || p.type === 'hospital') {
        kind = 'consultation';
        const itemsAppt: any[] = await this.appts.find({ $or: [{ doctor_id: p.id }, { doctor_user_id: p.user_id }, { account_id: p.user_id }], createdAt: { $gte: since } }, { status: 1, state_history: 1, createdAt: 1, slot_start: 1 }).lean();
        items = itemsAppt.map((a: any) => ({ ...a, state: a.status, scheduled_at: a.slot_start }));
      }
      const itemsWithKind = items.map(i => ({ ...i, kind }));
      const m = this.scoreBucket(itemsWithKind as any);
      out.push({
        provider_id: p.id, user_id: p.user_id, name_ar: p.name_ar, type: p.type, city: p.city,
        rating: p.rating || 0, total_60d: m.total, ...m,
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  /** Patient 360 — universal-state aware across ALL 5 service kinds. */
  async patientProfile(patient_id: string) {
    const user = await this.users.findOne({ id: patient_id }, { password_hash: 0, _id: 0, __v: 0 }).lean();
    if (!user) return { error: 'not_found' };
    const since = new Date(Date.now() - 365 * 86400000);
    const [orders, labs, rads, home, appts, recentEvents] = await Promise.all([
      this.orders.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean(),
      this.labs.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
      this.rads.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
      this.home.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
      this.appts.find({ patient_id, createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
      this.events.find({ actor_account_id: patient_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const isActive = (kind: any, st: string) => ![ServiceState.COMPLETED, ServiceState.CANCELLED].includes(toUniversal(kind, st));
    const activeOrders = orders.filter(o => isActive('pharmacy', o.state));
    const activeLabs = labs.filter(b => isActive('lab', b.state));
    const activeRads = rads.filter(b => isActive('radiology', b.state));
    const activeHome = home.filter(b => isActive('nursing', b.state));
    const activeAppts = appts.filter((a: any) => isActive('consultation', a.status));
    const ins_usage = {
      orders_using_insurance: orders.filter(o => (o as any).payment_method === 'insurance').length,
      labs_using_insurance: labs.filter(b => b.payment_method === 'insurance').length,
      rads_using_insurance: rads.filter(b => b.payment_method === 'insurance').length,
      insurance_providers: Array.from(new Set([
        ...labs.map(b => b.insurance_provider).filter(Boolean),
        ...rads.map(b => b.insurance_provider).filter(Boolean),
      ])),
    };
    return {
      user, summary: {
        total_orders: orders.length, active_orders: activeOrders.length,
        total_labs: labs.length, active_labs: activeLabs.length,
        total_rads: rads.length, active_rads: activeRads.length,
        total_nursing: home.length, active_nursing: activeHome.length,
        total_consultation: appts.length, active_consultation: activeAppts.length,
        spend_estimate: orders.reduce((s, o) => s + ((o as any).total || 0), 0)
          + labs.reduce((s, b) => s + (b.total || 0), 0)
          + rads.reduce((s, b) => s + (b.total || 0), 0)
          + home.reduce((s, b: any) => s + (b.total || 0), 0)
          + appts.reduce((s: number, a: any) => s + (a.price || 0), 0),
      }, insurance_usage: ins_usage,
      active: {
        orders: activeOrders.slice(0, 10),
        labs: activeLabs.slice(0, 10),
        rads: activeRads.slice(0, 10),
        nursing: activeHome.slice(0, 10),
        consultation: activeAppts.slice(0, 10),
      },
      history: {
        orders: orders.slice(0, 50),
        labs: labs.slice(0, 30),
        rads: rads.slice(0, 30),
        nursing: home.slice(0, 30),
        consultation: appts.slice(0, 30),
      },
      recent_events: recentEvents,
    };
  }

  /** Full trace — supports 5 entity types. */
  async entityTrace(entity_type: string, entity_id: string) {
    const events = await this.events.find({ entity_type, entity_id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
    let entity: any = null;
    let state_history: any[] = [];
    if (entity_type === 'order' || entity_type === 'pharmacy_order') {
      entity = await this.orders.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
      state_history = entity?.state_history || [];
    } else if (entity_type === 'lab_booking') {
      entity = await this.labs.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
      state_history = entity?.state_history || [];
    } else if (entity_type === 'radiology_booking') {
      entity = await this.rads.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
      state_history = entity?.state_history || [];
    } else if (entity_type === 'nursing_booking') {
      entity = await this.home.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
      state_history = entity?.state_history || [];
    } else if (entity_type === 'appointment') {
      entity = await this.appts.findOne({ id: entity_id }, { _id: 0, __v: 0 }).lean();
      state_history = entity?.state_history || [];
    }
    return { entity, events, state_history };
  }

  /** Global summary — uses engine universal states across ALL 5 domains. */
  async globalSummary() {
    const activePharmacy = domainStatesFor('pharmacy', ServiceState.CANCELLED).concat(domainStatesFor('pharmacy', ServiceState.COMPLETED));
    const activeLab = domainStatesFor('lab', ServiceState.CANCELLED).concat(domainStatesFor('lab', ServiceState.COMPLETED));
    const activeRad = domainStatesFor('radiology', ServiceState.CANCELLED).concat(domainStatesFor('radiology', ServiceState.COMPLETED));
    const activeNur = domainStatesFor('nursing', ServiceState.CANCELLED).concat(domainStatesFor('nursing', ServiceState.COMPLETED));
    const activeCon = domainStatesFor('consultation', ServiceState.CANCELLED).concat(domainStatesFor('consultation', ServiceState.COMPLETED));
    const [
      ordersTotal, ordersActive,
      labsTotal, labsActive,
      radsTotal, radsActive,
      homeTotal, homeActive,
      apptsTotal, apptsActive,
      providersTotal, providersActive,
      patientsTotal,
      eventsLast24h,
    ] = await Promise.all([
      this.orders.estimatedDocumentCount(),
      this.orders.countDocuments({ state: { $nin: activePharmacy } }),
      this.labs.estimatedDocumentCount(),
      this.labs.countDocuments({ state: { $nin: activeLab } }),
      this.rads.estimatedDocumentCount(),
      this.rads.countDocuments({ state: { $nin: activeRad } }),
      this.home.estimatedDocumentCount(),
      this.home.countDocuments({ state: { $nin: activeNur } }),
      this.appts.estimatedDocumentCount(),
      this.appts.countDocuments({ status: { $nin: activeCon } }),
      this.providers.estimatedDocumentCount(),
      this.providers.countDocuments({ status: 'active' }),
      this.users.countDocuments({ role: 'patient' }),
      this.events.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    return {
      orders: { total: ordersTotal, active: ordersActive },
      labs: { total: labsTotal, active: labsActive },
      radiology: { total: radsTotal, active: radsActive },
      nursing: { total: homeTotal, active: homeActive },
      consultation: { total: apptsTotal, active: apptsActive },
      providers: { total: providersTotal, active: providersActive },
      patients: { total: patientsTotal },
      events_last_24h: eventsLast24h,
      generated_at: new Date(),
    };
  }
}

import { SystemConfig, SystemConfigSchema } from '../../schemas/system-config.schema';

@Controller('admin/governance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminGovernanceController {
  constructor(private svc: AdminGovernanceService) {}
  @Get('summary') summary() { return this.svc.globalSummary(); }
  @Get('providers-performance') perf(@Query() q: any) { return this.svc.providersPerformance({ type: q.type, limit: q.limit ? Number(q.limit) : undefined }); }
  @Get('patient/:id') patient(@Param('id') id: string) { return this.svc.patientProfile(id); }
  @Get('trace/:entity_type/:entity_id') trace(@Param('entity_type') et: string, @Param('entity_id') ei: string) { return this.svc.entityTrace(et, ei); }
}

@Controller('kill-switches')
@UseGuards(JwtAuthGuard)
export class KillSwitchesController {
  constructor(@InjectModel(SystemConfig.name) private configModel: Model<any>) {}

  private defaultSwitches = [
    { id: "KS001", name: "الشات الكامل", key: "chat_enabled", value: true, description: "إيقاف يوقف جميع المحادثات في التطبيق فوراً", danger: true },
    { id: "KS002", name: "الكشوفات الأونلاين", key: "online_consultations", value: true, description: "إيقاف حجوزات الفيديو والاستشارات عن بعد", danger: true },
    { id: "KS003", name: "سحب الأرباح للمزودين", key: "provider_withdrawals", value: true, description: "تجميد سحب الأرباح من محافظ المزودين", danger: true },
    { id: "KS004", name: "بروكاست الصيدلية", key: "pharmacy_broadcast", value: true, description: "إيقاف إرسال طلبات الأدوية للصيدليات", danger: false },
    { id: "KS005", name: "بروكاست التمريض", key: "nursing_broadcast", value: true, description: "إيقاف إرسال طلبات التمريض المنزلي", danger: false },
    { id: "KS006", name: "التسجيل الجديد", key: "new_registrations", value: true, description: "إيقاف تسجيل مزودين ومرضى جدد", danger: false },
    { id: "KS007", name: "نظام الطوارئ والإسعاف", key: "emergency_system", value: true, description: "إيقاف زر الاستغاثة وإرسال الإسعاف", danger: true },
    { id: "KS008", name: "نشر التقييمات", key: "reviews_enabled", value: true, description: "إيقاف نشر تقييمات ومراجعات المرضى الجديدة", danger: false },
    { id: "KS009", name: "الدفع الإلكتروني", key: "online_payments", value: true, description: "إيقاف بوابات الدفع — الطلبات كاش فقط", danger: true },
  ];

  @Get()
  async list() {
    let config = await this.configModel.findOne({ key: 'kill_switches' });
    if (!config) {
      config = await this.configModel.create({ key: 'kill_switches', value: this.defaultSwitches });
    }
    return config.value;
  }

  @Post(':key')
  async toggle(@Param('key') key: string, @Body() body: { value: boolean; reason?: string }) {
    let config = await this.configModel.findOne({ key: 'kill_switches' });
    if (!config) {
      config = await this.configModel.create({ key: 'kill_switches', value: this.defaultSwitches });
    }
    const list = [...config.value];
    const sw = list.find(s => s.key === key);
    if (sw) {
      sw.value = body.value;
      config.value = list;
      config.markModified('value');
      await config.save();
    }
    return config.value;
  }
}

@Controller('commissions')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class CommissionsController {
  constructor(
    @InjectModel('ProviderProfile') private profiles: Model<any>,
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('LabBooking') private labs: Model<any>,
    @InjectModel('RadiologyBooking') private rads: Model<any>,
    @InjectModel('HomeCareBooking') private home: Model<any>,
    @InjectModel(Appointment.name) private appts: Model<any>,
  ) {}

  @Get()
  async list() {
    const list = await this.profiles.find({}, { account_id: 1, name_ar: 1, type: 1, commission_rate: 1 }).lean();
    const since = new Date(Date.now() - 30 * 86400000);
    const out = [];
    for (const p of list) {
      const commission = p.commission_rate !== undefined ? p.commission_rate : (p.type === 'pharmacy' ? 5 : p.type === 'lab' ? 8 : p.type === 'radiology' ? 10 : p.type === 'home_care' ? 15 : 10);
      let revenue = 0;
      if (p.type === 'pharmacy') {
        const ords = await this.orders.find({ pharmacy_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
        revenue = ords.reduce((sum, o) => sum + (o.total || 0), 0);
      } else if (p.type === 'lab') {
        const lbs = await this.labs.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
        revenue = lbs.reduce((sum, b) => sum + (b.total || 0), 0);
      } else if (p.type === 'radiology') {
        const rds = await this.rads.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
        revenue = rds.reduce((sum, b) => sum + (b.total || 0), 0);
      } else if (p.type === 'home_care') {
        const hc = await this.home.find({ account_id: p.account_id, state: 'completed', createdAt: { $gte: since } }, { total: 1 }).lean();
        revenue = hc.reduce((sum, b) => sum + (b.total || 0), 0);
      } else if (['doctor', 'clinic', 'hospital'].includes(p.type)) {
        const apts = await this.appts.find({ $or: [{ doctor_user_id: p.account_id }, { account_id: p.account_id }], status: 'completed', createdAt: { $gte: since } }, { price: 1 }).lean();
        revenue = apts.reduce((sum, a) => sum + (a.price || 0), 0);
      }
      const earnings = Math.round((revenue * commission) / 100);
      out.push({
        id: p.account_id,
        name: p.name_ar || p.account_id,
        type: p.type,
        commission,
        revenue,
        earnings,
      });
    }
    return out;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { commission: number }) {
    await this.profiles.updateOne({ account_id: id }, { $set: { commission_rate: Number(body.commission) } });
    return { success: true };
  }
}

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'SystemEvent', schema: SystemEventSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: 'B2BRequest', schema: B2BRequestSchema },
    ]),
  ],
  controllers: [AdminGovernanceController, KillSwitchesController, CommissionsController, B2BController, SystemConfigController],
  providers: [AdminGovernanceService],
  exports: [AdminGovernanceService],
})
export class AdminGovernanceModule {}

