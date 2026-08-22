/**
 * AdminSpaModule — REST surface expected by the admin console SPA
 * (Napd-admin/frontend/src/api/endpoints.js), discovered by the screen↔API
 * wiring audit. All handlers are DB-backed (raw collections, same pattern as
 * CompatModule) and admin-role guarded — no mocks, no stubs.
 *
 * Two endpoints are shared with patient/provider apps (/delivery/check,
 * /promotions/applicable) and intentionally skip the admin role.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  ServiceUnavailableException,
  Module,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuid } from 'uuid';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

const now = () => new Date();
const uid = (u: any) => u?.id || u?._id || u?.user_id;

const byId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
    try { or.push({ _id: new (require('mongoose').Types.ObjectId)(id) }); } catch { /* noop */ }
  }
  return { $or: or };
};

const rx = (s: string) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

abstract class AdminController {
  @InjectConnection() protected conn: Connection;
}

/* ── dashboard ───────────────────────────────────────────────────────────── */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminDashboardController extends AdminController {
  @Get('kpis')
  async kpis() {
    const day = new Date(Date.now() - 24 * 3600 * 1000);
    const [patients, providers, pendingProviders, apptsToday, ordersToday, activeSos, pendingClaims] = await Promise.all([
      this.conn.collection('users').countDocuments({ role: 'patient' } as any),
      this.conn.collection('provider_profiles').countDocuments({} as any),
      this.conn.collection('provider_profiles').countDocuments({ verification_status: { $nin: ['verified'] } } as any),
      this.conn.collection('appointments').countDocuments({ createdAt: { $gte: day } } as any),
      this.conn.collection('orders').countDocuments({ createdAt: { $gte: day } } as any),
      this.conn.collection('emergencyrequests').countDocuments({ state: { $nin: ['RESOLVED', 'CLOSED'] } } as any),
      this.conn.collection('insuranceservicerequests').countDocuments({ state: 'PENDING_PROVIDER_REVIEW' } as any),
    ]);
    return {
      patients, providers, pending_provider_approvals: pendingProviders,
      appointments_24h: apptsToday, orders_24h: ordersToday,
      active_emergencies: activeSos, pending_insurance_claims: pendingClaims,
      generated_at: now(),
    };
  }

  @Get('alerts')
  async alerts() {
    const [sos, shortages, pendingProviders, openComplaints] = await Promise.all([
      this.conn.collection('emergencyrequests').find({ state: { $nin: ['RESOLVED', 'CLOSED'] } } as any).sort({ createdAt: -1 }).limit(10).toArray(),
      this.conn.collection('pharmacy_shortage_reports').find({ status: 'open' } as any).sort({ createdAt: -1 }).limit(10).toArray(),
      this.conn.collection('provider_profiles').find({ verification_status: { $nin: ['verified'] } } as any).sort({ createdAt: -1 }).limit(10).toArray(),
      this.conn.collection('complaints').find({ status: { $nin: ['resolved', 'closed'] } } as any).sort({ createdAt: -1 }).limit(10).toArray(),
    ]);
    const alerts: any[] = [];
    for (const e of sos) alerts.push({ kind: 'emergency', severity: 'critical', id: e.id || String(e._id), title: 'بلاغ طوارئ نشط', created_at: e.createdAt });
    for (const s of shortages) alerts.push({ kind: 'shortage', severity: 'warning', id: String(s._id), title: `بلاغ نقص دواء: ${s.product_name || s.medicine_id || ''}`, created_at: s.createdAt });
    for (const p of pendingProviders) alerts.push({ kind: 'provider_approval', severity: 'info', id: p.id || String(p._id), title: `مزوّد بانتظار الاعتماد: ${p.name || p.facility_name || ''}`, created_at: p.createdAt });
    for (const c of openComplaints) alerts.push({ kind: 'complaint', severity: 'warning', id: c.id || String(c._id), title: c.subject || 'شكوى مفتوحة', created_at: c.createdAt });
    alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return alerts.slice(0, 30);
  }

  @Get('live-feed')
  async liveFeed() {
    const [orders, appts, sos] = await Promise.all([
      this.conn.collection('orders').find({} as any).sort({ createdAt: -1 }).limit(10).toArray(),
      this.conn.collection('appointments').find({} as any).sort({ createdAt: -1 }).limit(10).toArray(),
      this.conn.collection('emergencyrequests').find({} as any).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);
    const feed: any[] = [];
    for (const o of orders) feed.push({ kind: 'order', id: o.id || String(o._id), label: `طلب صيدلية — ${o.status || o.state || ''}`, at: o.createdAt });
    for (const a of appts) feed.push({ kind: 'appointment', id: a.id || String(a._id), label: `موعد — ${a.status || ''}`, at: a.createdAt });
    for (const e of sos) feed.push({ kind: 'emergency', id: e.id || String(e._id), label: `طوارئ — ${e.state || ''}`, at: e.createdAt });
    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return feed.slice(0, 25);
  }
}

/* ── broadcast ───────────────────────────────────────────────────────────── */
@Controller('broadcast')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminBroadcastController extends AdminController {
  @Get('live')
  async live() {
    const rows = await this.conn.collection('admin_broadcasts')
      .find({ status: { $in: ['scheduled', 'sending', 'sent'] } } as any)
      .sort({ createdAt: -1 }).limit(50).toArray();
    return rows.map((b: any) => ({ ...b, id: b.id || String(b._id) }));
  }

  @Get('config')
  async config() {
    const doc = await this.conn.collection('admin_config').findOne({ key: 'broadcast' } as any);
    return doc?.value || {};
  }

  @Put('config')
  async putConfig(@CurrentUser() user: any, @Body() body: any) {
    await this.conn.collection('admin_config').updateOne(
      { key: 'broadcast' } as any,
      { $set: { key: 'broadcast', value: body || {}, updated_by: uid(user), updatedAt: now() } },
      { upsert: true },
    );
    return { ok: true };
  }

  @Post(':id/expand')
  async expand(@Param('id') id: string, @Body() body: { segments?: string[] }) {
    const segments = Array.isArray(body?.segments) ? body.segments.map(String) : [];
    const update: any = { $set: { updatedAt: now() } };
    if (segments.length) update.$addToSet = { target_segments: { $each: segments } };
    const res = await this.conn.collection('admin_broadcasts').updateOne(byId(id) as any, update);
    if (!res.matchedCount) throw new NotFoundException('الحملة غير موجودة');
    return { ok: true, added: segments.length };
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const res = await this.conn.collection('admin_broadcasts').updateOne(
      byId(id) as any,
      { $set: { status: 'cancelled', cancelled_by: uid(user), cancelled_at: now() } },
    );
    if (!res.matchedCount) throw new NotFoundException('الحملة غير موجودة');
    return { ok: true };
  }
}

/* ── emergency dispatch (complements emergency.controller assign) ────────── */
@Controller('emergency')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminEmergencyController extends AdminController {
  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { ambulance_id?: string; note?: string }) {
    if (!body?.ambulance_id) throw new BadRequestException('ambulance_id مطلوب');
    const res = await this.conn.collection('emergencyrequests').updateOne(
      byId(id) as any,
      {
        $set: { assigned_ambulance_id: body.ambulance_id, state: 'DISPATCH_INITIATED', updatedAt: now() },
        $push: { state_history: { from: null, to: 'DISPATCH_INITIATED', by: uid(user), note: body.note || `ambulance ${body.ambulance_id}`, at: now() } } as any,
      },
    );
    if (!res.matchedCount) throw new NotFoundException('بلاغ الطوارئ غير موجود');
    await this.conn.collection('sos_dispatches').insertOne({
      emergency_id: id, ambulance_id: body.ambulance_id, note: body.note || null,
      dispatched_by: uid(user), createdAt: now(),
    } as any);
    return { ok: true, state: 'DISPATCH_INITIATED' };
  }
}

/* ── provider ops master-data lists ──────────────────────────────────────── */
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminContractsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('provider_contracts').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('shifts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminShiftsController extends AdminController {
  @Get()
  async list(@Query('facility_id') facilityId?: string) {
    const filter: any = facilityId ? { facility_id: facilityId } : {};
    const rows = await this.conn.collection('shifts').find(filter).sort({ date: 1 }).limit(500).toArray();
    return rows.map((s: any) => ({ ...s, id: s.id || String(s._id) }));
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.facility_id || !body?.staff_id || !body?.date) throw new BadRequestException('المنشأة والموظف والتاريخ مطلوبة');
    const doc = {
      id: uuid(), facility_id: String(body.facility_id), staff_id: String(body.staff_id),
      staff_name: body.staff_name || null, role: body.role || null,
      date: new Date(body.date), start: body.start || null, end: body.end || null,
      status: 'scheduled', created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('shifts').insertOne(doc as any);
    return doc;
  }
}

@Controller('scorecard')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminScorecardController extends AdminController {
  @Get()
  async list() {
    const profiles = await this.conn.collection('provider_profiles').find({} as any)
      .project({ id: 1, name: 1, facility_name: 1, type: 1, specialty: 1, city: 1, rating_avg: 1, rating_count: 1, verification_status: 1 })
      .limit(300).toArray();
    const ids = profiles.flatMap((p: any) => [p.id, p.user_id, p.account_id].filter(Boolean).map(String));
    const completed = await this.conn.collection('appointments').aggregate([
      { $match: { provider_id: { $in: ids }, status: { $in: ['COMPLETED', 'completed'] } } },
      { $group: { _id: '$provider_id', count: { $sum: 1 } } },
    ]).toArray();
    const byProvider = new Map(completed.map((c: any) => [String(c._id), c.count]));
    return profiles.map((p: any) => ({
      id: p.id || String(p._id), name: p.name || p.facility_name, type: p.type, specialty: p.specialty, city: p.city,
      rating_avg: p.rating_avg ?? 0, rating_count: p.rating_count ?? 0,
      completed_appointments: byProvider.get(String(p.id)) || 0,
      verification_status: p.verification_status || 'pending',
    }));
  }
}

@Controller('compliance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminComplianceController extends AdminController {
  @Get()
  async list() {
    const profiles = await this.conn.collection('provider_profiles')
      .find({ verification_status: { $nin: ['verified'] } } as any).limit(300).toArray();
    const accountIds = profiles.flatMap((p: any) => [p.account_id, p.user_id, p.id].filter(Boolean).map(String));
    const docs = await this.conn.collection('providerdocuments')
      .find({ $or: [{ account_id: { $in: accountIds } }, { provider_id: { $in: accountIds } }, { user_id: { $in: accountIds } }] } as any)
      .project({ account_id: 1, provider_id: 1, user_id: 1, kind: 1, status: 1 }).toArray();
    const docCount = new Map<string, number>();
    for (const d of docs) {
      for (const k of [d.account_id, d.provider_id, d.user_id].filter(Boolean).map(String)) {
        docCount.set(k, (docCount.get(k) || 0) + 1);
      }
    }
    return profiles.map((p: any) => {
      const keys = [p.account_id, p.user_id, p.id].filter(Boolean).map(String);
      const submitted = Math.max(0, ...keys.map((k) => docCount.get(k) || 0));
      return {
        provider_id: p.id || String(p._id), name: p.name || p.facility_name,
        type: p.type, verification_status: p.verification_status || 'pending',
        documents_submitted: submitted, documents_required: 4,
        compliant: (p.verification_status === 'verified') && submitted >= 4,
      };
    });
  }
}

@Controller('transport')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminTransportController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('transport_units').find({} as any).sort({ createdAt: -1 }).limit(200).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('family-cards')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminFamilyCardsController extends AdminController {
  @Get()
  async list() {
    const groups = await this.conn.collection('family_groups').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return groups.map((g: any) => ({
      id: g.id || String(g._id), owner_id: g.owner_id, name: g.name,
      members: Array.isArray(g.members) ? g.members.length : 0,
      created_at: g.createdAt,
    }));
  }
}

@Controller('blacklist')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminBlacklistController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('bans').find({ active: { $ne: false } } as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((b: any) => ({
      id: b.id || String(b._id), user_id: b.user_id || b.account_id,
      reason: b.reason, banned_by: b.banned_by || b.created_by,
      created_at: b.createdAt, expires_at: b.expires_at || null,
    }));
  }
}

@Controller('fraud')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminFraudController extends AdminController {
  @Get('alerts')
  async alerts() {
    const rows = await this.conn.collection('fraud_alerts').find({ status: { $nin: ['resolved', 'dismissed'] } } as any)
      .sort({ createdAt: -1 }).limit(200).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('admins')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminAdminsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('users')
      .find({ role: { $in: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'] } } as any)
      .project({ id: 1, full_name: 1, email: 1, phone: 1, role: 1, createdAt: 1, banned: 1 })
      .limit(200).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), name: r.full_name, email: r.email, phone: r.phone,
      role: r.role, active: !r.banned, created_at: r.createdAt,
    }));
  }
}

@Controller('waitlist')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminWaitlistController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('waitlist_entries').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('referrals')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminReferralsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('outbound_referrals').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), referrer_doctor_id: r.referrer_doctor_id, patient_id: r.patient_id,
      referral_code: r.referral_code, target_type: r.target_type, status: r.status, created_at: r.createdAt,
    }));
  }
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminTasksController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('admin_tasks').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.title) throw new BadRequestException('عنوان المهمة مطلوب');
    const doc = {
      id: uuid(), title: String(body.title), description: body.description || null,
      assignee: body.assignee || null, due_date: body.due_date ? new Date(body.due_date) : null,
      status: 'open', created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('admin_tasks').insertOne(doc as any);
    return doc;
  }
}

/* master data: specialties + services + complaints + cms + banners */
const SA_SPECIALTIES = [
  ['cardiology', 'قلب وأوعية دموية'], ['dermatology', 'جلدية'], ['pediatrics', 'طب أطفال'],
  ['obgyn', 'نساء وولادة'], ['orthopedics', 'عظام'], ['neurology', 'أعصاب'],
  ['psychiatry', 'طب نفسي'], ['dentistry', 'أسنان'], ['ophthalmology', 'عيون'],
  ['ent', 'أنف وأذن وحنجرة'], ['internal', 'باطنية'], ['family', 'طب أسرة'],
  ['urology', 'مسالك بولية'], ['gastro', 'جهاز هضمي'], ['endocrine', 'غدد صماء وسكري'],
  ['pulmonology', 'صدرية'], ['nephrology', 'كلى'], ['oncology', 'أورام'],
  ['rheumatology', 'روماتيزم'], ['surgery', 'جراحة عامة'], ['physiotherapy', 'علاج طبيعي'],
  ['nutrition', 'تغذية'], ['emergency', 'طوارئ'],
];

@Controller('specialties')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminSpecialtiesController extends AdminController {
  @Get()
  async list() {
    const col = this.conn.collection('specialties');
    if ((await col.countDocuments({} as any)) === 0) {
      await col.insertMany(SA_SPECIALTIES.map(([code, name_ar], i) => ({
        id: `spec-${code}`, code, name_ar, name_en: code, sort: i + 1, active: true, createdAt: now(), updatedAt: now(),
      })) as any);
    }
    const rows = await col.find({ active: { $ne: false } } as any).sort({ sort: 1 }).limit(200).toArray();
    return rows.map((s: any) => ({ id: s.id || String(s._id), code: s.code, name_ar: s.name_ar, name_en: s.name_en, active: s.active !== false }));
  }

  @Post()
  async create(@Body() body: any) {
    if (!body?.name_ar || !body?.code) throw new BadRequestException('الرمز والاسم مطلوبان');
    const doc = { id: `spec-${body.code}`, code: String(body.code), name_ar: String(body.name_ar), name_en: body.name_en || String(body.code), sort: Number(body.sort) || 100, active: true, createdAt: now(), updatedAt: now() };
    await this.conn.collection('specialties').updateOne({ code: doc.code } as any, { $set: doc }, { upsert: true });
    return doc;
  }
}

@Controller('services')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminServicesController extends AdminController {
  @Get()
  async list() {
    const [labs, rads, home] = await Promise.all([
      this.conn.collection('labservices').find({ active: { $ne: false } } as any).limit(200).toArray(),
      this.conn.collection('radiologyservices').find({ active: { $ne: false } } as any).limit(200).toArray(),
      this.conn.collection('homecareservices').find({ active: { $ne: false } } as any).limit(200).toArray(),
    ]);
    const map = (t: string) => (s: any) => ({
      id: s.id || String(s._id), type: t, name_ar: s.name_ar, name_en: s.name_en,
      price: s.price, category: s.category || null, active: s.active !== false,
    });
    return [...labs.map(map('lab')), ...rads.map(map('radiology')), ...home.map(map('home_care'))];
  }
}

@Controller('complaints')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminComplaintsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('complaints').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('cms')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminCmsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('cms_pages').find({} as any).sort({ updatedAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }
}

@Controller('banners')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminBannersController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('banners').find({} as any).sort({ sort: 1 }).limit(100).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.title_ar) throw new BadRequestException('عنوان البانر مطلوب');
    const doc = {
      id: uuid(), title_ar: String(body.title_ar), title_en: body.title_en || null,
      image_url: body.image_url || null, link: body.link || null,
      sort: Number(body.sort) || 0, active: body.active !== false,
      created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('banners').insertOne(doc as any);
    return doc;
  }
}

/* ── orders reassign ─────────────────────────────────────────────────────── */
@Controller('orders')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminOrdersController extends AdminController {
  @Post(':id/reassign')
  async reassign(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { provider_id?: string }) {
    const pid = String(body?.provider_id || '').trim();
    if (!pid) throw new BadRequestException('provider_id مطلوب');
    const order: any = await this.conn.collection('orders').findOne(byId(id) as any);
    if (!order) throw new NotFoundException('الطلب غير موجود');
    const provider = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ id: pid }, { user_id: pid }, { account_id: pid }] } as any,
    );
    if (!provider) throw new NotFoundException('مزوّد الخدمة غير موجود');
    const prev = order.pharmacy_id || order.provider_id || null;
    await this.conn.collection('orders').updateOne(byId(id) as any, {
      $set: { pharmacy_id: pid, provider_id: pid, updatedAt: now() },
      $push: {
        state_history: {
          from: order.state || order.status || null, to: order.state || order.status || null,
          by_user_id: uid(user), by_role: 'admin',
          note: `reassigned from ${prev || 'unassigned'} to ${pid}`, at: now(),
        },
      } as any,
    });
    return { ok: true, order_id: order.id || id, provider_id: pid, previous: prev };
  }
}

/* ── financial summary ───────────────────────────────────────────────────── */
@Controller('financial')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminFinancialController extends AdminController {
  @Get('summary')
  async summary() {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const [gmvRows, monthRows, refundsPending, copayRows, withdrawalsPending] = await Promise.all([
      this.conn.collection('orders').aggregate([
        { $match: { status: { $nin: ['cancelled', 'CANCELLED'] } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$totals.total', 0] } }, count: { $sum: 1 } } },
      ]).toArray(),
      this.conn.collection('orders').aggregate([
        { $match: { createdAt: { $gte: month }, status: { $nin: ['cancelled', 'CANCELLED'] } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$totals.total', 0] } }, count: { $sum: 1 } } },
      ]).toArray(),
      this.conn.collection('refund_requests').countDocuments({ status: { $in: ['pending', 'requested'] } } as any),
      this.conn.collection('insuranceservicerequests').aggregate([
        { $match: { state: 'COPAY_PAID' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$copay_amount', 0] } }, count: { $sum: 1 } } },
      ]).toArray(),
      this.conn.collection('withdrawals').countDocuments({ status: { $in: ['pending', 'PENDING'] } } as any),
    ]);
    return {
      gmv_total: gmvRows[0]?.total || 0, orders_total: gmvRows[0]?.count || 0,
      gmv_month: monthRows[0]?.total || 0, orders_month: monthRows[0]?.count || 0,
      refunds_pending: refundsPending,
      copay_collected: copayRows[0]?.total || 0, copay_count: copayRows[0]?.count || 0,
      withdrawals_pending: withdrawalsPending,
      generated_at: now(),
    };
  }
}

/* ── commissions / refunds / coupons ─────────────────────────────────────── */
@Controller('commissions')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminCommissionsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('commissionrules').find({} as any).limit(200).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { commission?: any }) {
    if (body?.commission === undefined) throw new BadRequestException('قيمة العمولة مطلوبة');
    const res = await this.conn.collection('commissionrules').updateOne(
      byId(id) as any,
      { $set: { commission: body.commission, updated_by: uid(user), updatedAt: now() } },
    );
    if (!res.matchedCount) throw new NotFoundException('قاعدة العمولة غير موجودة');
    return { ok: true };
  }
}

@Controller('refunds')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminRefundsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('refund_requests').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: { order_id?: string; amount?: number; reason?: string }) {
    if (!body?.order_id || !(Number(body?.amount) > 0)) throw new BadRequestException('order_id والمبلغ مطلوبان');
    const doc = {
      id: uuid(), order_id: String(body.order_id), amount: Number(body.amount),
      reason: body.reason || null, status: 'pending', issued_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('refund_requests').insertOne(doc as any);
    return doc;
  }
}

@Controller('coupons')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminCouponsController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('coupons').find({} as any).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.code) throw new BadRequestException('رمز القسيمة مطلوب');
    const doc = {
      id: uuid(), code: String(body.code).toUpperCase(),
      discount_percent: body.discount_percent ?? null, discount_amount: body.discount_amount ?? null,
      max_uses: body.max_uses ?? null, used_count: 0,
      valid_from: body.valid_from ? new Date(body.valid_from) : now(),
      valid_until: body.valid_until ? new Date(body.valid_until) : null,
      // E1 S13 rule fields — all enforced by CouponService.validate
      min_order: body.min_order ?? null,
      max_discount: body.max_discount ?? null,
      usage_limit_per_user: body.usage_limit_per_user ?? 1,
      provider_id: body.provider_id ?? null,
      categories: Array.isArray(body.categories) ? body.categories : [],
      first_order_only: body.first_order_only === true,
      campaign_id: body.campaign_id ?? null,
      active: true, created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('coupons').updateOne({ code: doc.code } as any, { $set: doc }, { upsert: true });
    return doc;
  }

  @Patch(':code')
  async update(@CurrentUser() user: any, @Param('code') code: string, @Body() body: any) {
    const allowed = ['discount_percent', 'discount_amount', 'max_uses', 'valid_from', 'valid_until',
      'min_order', 'max_discount', 'usage_limit_per_user', 'provider_id', 'categories',
      'first_order_only', 'campaign_id', 'active'];
    const $set: any = { updatedAt: now() };
    for (const k of allowed) if (body?.[k] !== undefined) $set[k] = body[k];
    const r = await this.conn.collection('coupons').updateOne({ code: String(code).toUpperCase() } as any, { $set });
    if (!r.matchedCount) throw new NotFoundException('coupon_not_found');
    return { ok: true };
  }
}

/* ── loyalty administration ──────────────────────────────────────────────── */
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminLoyaltyController extends AdminController {
  @Put('config')
  async putConfig(@CurrentUser() user: any, @Body() body: any) {
    await this.conn.collection('loyalty_config').updateOne(
      { key: 'global' } as any,
      { $set: { key: 'global', value: body || {}, updated_by: uid(user), updatedAt: now() } },
      { upsert: true },
    );
    return { ok: true };
  }

  @Put('earn-rules/:id')
  async updateEarnRule(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    const allowed = ['name_ar', 'name_en', 'event', 'points', 'multiplier', 'active', 'conditions'];
    const $set: any = { updated_by: uid(user), updatedAt: now() };
    for (const k of allowed) if (k in (body || {})) $set[k] = body[k];
    const res = await this.conn.collection('loyalty_earn_rules').updateOne(byId(id) as any, { $set });
    if (!res.matchedCount) throw new NotFoundException('القاعدة غير موجودة');
    return { ok: true };
  }

  @Post('earn-rules/:id/toggle')
  async toggleEarnRule(@Param('id') id: string) {
    const doc: any = await this.conn.collection('loyalty_earn_rules').findOne(byId(id) as any);
    if (!doc) throw new NotFoundException('القاعدة غير موجودة');
    await this.conn.collection('loyalty_earn_rules').updateOne(byId(id) as any, { $set: { active: !doc.active, updatedAt: now() } });
    return { ok: true, active: !doc.active };
  }

  @Get('users/:id/balance')
  async balance(@Param('id') id: string) {
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: id } as any);
    const recent = await this.conn.collection('loyalty_transactions')
      .find({ user_id: id } as any).sort({ createdAt: -1 }).limit(10).toArray();
    return {
      user_id: id, balance: acc?.balance ?? 0, lifetime_earned: acc?.lifetime_earned ?? 0,
      tier: acc?.tier || 'bronze',
      recent_transactions: recent.map((t: any) => ({ id: String(t._id), points: t.points, kind: t.kind, reason: t.reason, at: t.createdAt })),
    };
  }

  private async adjust(userId: string, points: number, kind: string, reason: string | null, by: string, orderId?: string) {
    await this.conn.collection('loyalty_accounts').updateOne(
      { user_id: userId } as any,
      {
        $inc: { balance: points, ...(points > 0 ? { lifetime_earned: points } : {}) },
        $setOnInsert: { user_id: userId, tier: 'bronze', createdAt: now() },
        $set: { updatedAt: now() },
      },
      { upsert: true },
    );
    await this.conn.collection('loyalty_transactions').insertOne({
      user_id: userId, points, kind, reason, order_id: orderId || null, by, createdAt: now(),
    } as any);
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId } as any);
    return { ok: true, balance: acc?.balance ?? 0 };
  }

  @Post('manual-adjust')
  async manualAdjust(@CurrentUser() user: any, @Body() body: { user_id?: string; points?: number; reason?: string }) {
    if (!body?.user_id || !Number.isFinite(Number(body?.points)) || Number(body.points) === 0) {
      throw new BadRequestException('user_id ونقاط غير صفرية مطلوبة');
    }
    const pts = Math.trunc(Number(body.points));
    return this.adjust(String(body.user_id), pts, pts > 0 ? 'admin_credit' : 'admin_debit', body.reason || null, uid(user));
  }

  @Post('redeem')
  async redeem(@CurrentUser() user: any, @Body() body: { user_id?: string; points?: number; order_id?: string }) {
    if (!body?.user_id || !(Number(body?.points) > 0)) throw new BadRequestException('user_id ونقاط موجبة مطلوبة');
    const pts = Math.trunc(Number(body.points));
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: String(body.user_id) } as any);
    if (!acc || (acc.balance ?? 0) < pts) throw new BadRequestException('رصيد النقاط غير كافٍ');
    return this.adjust(String(body.user_id), -pts, 'redeem', body.order_id ? `order ${body.order_id}` : null, uid(user), body.order_id);
  }
}

/* ── delivery rules (free-delivery engine) ───────────────────────────────── */
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminDeliveryController extends AdminController {
  @Get('rules')
  async rules() {
    const rows = await this.conn.collection('delivery_rules').find({} as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post('rules')
  async createRule(@CurrentUser() user: any, @Body() body: any) {
    const doc = {
      id: uuid(), name_ar: body?.name_ar || null,
      min_order_sar: body?.min_order_sar ?? null, service_type: body?.service_type || null,
      city: body?.city || null, user_segment: body?.user_segment || null,
      free: body?.free !== false, fee_sar: body?.fee_sar ?? 0,
      active: body?.active !== false, created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('delivery_rules').insertOne(doc as any);
    return doc;
  }

  @Put('rules/:id')
  async updateRule(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    const allowed = ['name_ar', 'min_order_sar', 'service_type', 'city', 'user_segment', 'free', 'fee_sar', 'active'];
    const $set: any = { updated_by: uid(user), updatedAt: now() };
    for (const k of allowed) if (k in (body || {})) $set[k] = body[k];
    const res = await this.conn.collection('delivery_rules').updateOne(byId(id) as any, { $set });
    if (!res.matchedCount) throw new NotFoundException('القاعدة غير موجودة');
    return { ok: true };
  }

  @Post('rules/:id/toggle')
  async toggleRule(@Param('id') id: string) {
    const doc: any = await this.conn.collection('delivery_rules').findOne(byId(id) as any);
    if (!doc) throw new NotFoundException('القاعدة غير موجودة');
    await this.conn.collection('delivery_rules').updateOne(byId(id) as any, { $set: { active: !doc.active, updatedAt: now() } });
    return { ok: true, active: !doc.active };
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string) {
    const res = await this.conn.collection('delivery_rules').deleteOne(byId(id) as any);
    if (!res.deletedCount) throw new NotFoundException('القاعدة غير موجودة');
    return { ok: true };
  }

  @Put('base-fees')
  async baseFees(@CurrentUser() user: any, @Body() body: any) {
    await this.conn.collection('delivery_config').updateOne(
      { key: 'base-fees' } as any,
      { $set: { key: 'base-fees', value: body || {}, updated_by: uid(user), updatedAt: now() } },
      { upsert: true },
    );
    return { ok: true };
  }

  @Post('toggle')
  async toggleSystem(@CurrentUser() user: any, @Body() body: { enabled?: boolean }) {
    await this.conn.collection('delivery_config').updateOne(
      { key: 'system' } as any,
      { $set: { key: 'system', enabled: body?.enabled !== false, updated_by: uid(user), updatedAt: now() } },
      { upsert: true },
    );
    return { ok: true, enabled: body?.enabled !== false };
  }
}

/* shared with patient/provider apps — any authenticated user */
@Controller('delivery')
class DeliveryCheckController extends AdminController {
  @Get('check')
  async check(@Query() q: any) {
    const cfg = await this.conn.collection('delivery_config').findOne({ key: 'system' } as any);
    if (cfg && cfg.enabled === false) return { free: false, fee_sar: null, reason: 'delivery_disabled' };
    const amount = Number(q?.order_amount) || 0;
    const fees: any = await this.conn.collection('delivery_config').findOne({ key: 'base-fees' } as any);
    const baseFee = Number(fees?.value?.base_delivery_fee_sar ?? 15);
    const rules = await this.conn.collection('delivery_rules').find({ active: { $ne: false } } as any).toArray();
    for (const r of rules) {
      if (r.service_type && q?.service_type && String(r.service_type) !== String(q.service_type)) continue;
      if (r.city && q?.city && String(r.city).toLowerCase() !== String(q.city).toLowerCase()) continue;
      if (r.min_order_sar != null && amount < Number(r.min_order_sar)) continue;
      return r.free === false
        ? { free: false, fee_sar: Number(r.fee_sar ?? baseFee), rule_id: r.id || String(r._id) }
        : { free: true, fee_sar: 0, rule_id: r.id || String(r._id) };
    }
    return { free: false, fee_sar: baseFee };
  }
}

/* ── promotions (shared store with provider/features + patient /offers) ──── */
@Controller('promotions')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminPromotionsController extends AdminController {
  @Get()
  async list(@Query('status') status?: string) {
    const filter: any = status ? { status } : {};
    const rows = await this.conn.collection('promotioncampaigns').find(filter).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const doc: any = await this.conn.collection('promotioncampaigns').findOne(byId(id) as any);
    if (!doc) throw new NotFoundException('العرض غير موجود');
    return { ...doc, id: doc.id || String(doc._id) };
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.title_ar) throw new BadRequestException('عنوان العرض مطلوب');
    const doc = {
      id: uuid(), provider_id: body.provider_id || null,
      title_ar: String(body.title_ar), title_en: body.title_en || null,
      original_price: body.original_price ?? null, discounted_price: body.discounted_price ?? null,
      start_date: body.start_date ? new Date(body.start_date) : now(),
      end_date: body.end_date ? new Date(body.end_date) : new Date(Date.now() + 30 * 86400000),
      image_url: body.image_url || null, target_parameters: body.target_parameters || {},
      status: body.status || 'approved', created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('promotioncampaigns').insertOne(doc as any);
    return doc;
  }

  @Put(':id')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    const allowed = ['title_ar', 'title_en', 'original_price', 'discounted_price', 'start_date', 'end_date', 'image_url', 'target_parameters', 'status'];
    const $set: any = { updated_by: uid(user), updatedAt: now() };
    for (const k of allowed) if (k in (body || {})) $set[k] = body[k];
    const res = await this.conn.collection('promotioncampaigns').updateOne(byId(id) as any, { $set });
    if (!res.matchedCount) throw new NotFoundException('العرض غير موجود');
    return { ok: true };
  }

  @Post(':id/toggle')
  async toggle(@Param('id') id: string) {
    const doc: any = await this.conn.collection('promotioncampaigns').findOne(byId(id) as any);
    if (!doc) throw new NotFoundException('العرض غير موجود');
    const next = doc.status === 'approved' ? 'paused' : 'approved';
    await this.conn.collection('promotioncampaigns').updateOne(byId(id) as any, { $set: { status: next, updatedAt: now() } });
    return { ok: true, status: next };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const res = await this.conn.collection('promotioncampaigns').deleteOne(byId(id) as any);
    if (!res.deletedCount) throw new NotFoundException('العرض غير موجود');
    return { ok: true };
  }
}

/* shared with patient app checkout — any authenticated user */
@Controller('promotions')
class PromotionsApplicableController extends AdminController {
  @Get('applicable')
  async applicable(@Query() q: any) {
    const nowD = now();
    const rows = await this.conn.collection('promotioncampaigns')
      .find({ status: 'approved', start_date: { $lte: nowD }, end_date: { $gte: nowD } } as any)
      .limit(100).toArray();
    const amount = Number(q?.order_amount) || 0;
    return rows
      .filter((p: any) => {
        const t = p.target_parameters || {};
        if (t.min_order_sar != null && amount < Number(t.min_order_sar)) return false;
        if (t.city && q?.city && String(t.city).toLowerCase() !== String(q.city).toLowerCase()) return false;
        if (t.gender && q?.gender && String(t.gender) !== String(q.gender)) return false;
        if (Array.isArray(t.services) && t.services.length && q?.services) {
          const wanted = String(q.services).split(',');
          if (!t.services.some((s: any) => wanted.includes(String(s)))) return false;
        }
        return true;
      })
      .map((p: any) => ({
        id: p.id || String(p._id), title_ar: p.title_ar, title_en: p.title_en,
        original_price: p.original_price, discounted_price: p.discounted_price,
        discount: p.original_price && p.discounted_price ? Math.round((1 - p.discounted_price / p.original_price) * 100) : null,
        end_date: p.end_date,
      }));
  }
}

/* ── notifications admin ─────────────────────────────────────────────────── */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminNotificationsController extends AdminController {
  @Get('history')
  async history() {
    const rows = await this.conn.collection('notifications').find({} as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((n: any) => ({
      id: n.id || String(n._id), user_id: n.user_id, title: n.title, body: n.body,
      kind: n.kind, read: !!n.read, created_at: n.createdAt,
    }));
  }

  @Post('send')
  async send(@CurrentUser() user: any, @Body() body: { user_id?: string; segment?: string; title?: string; body?: string; message?: string }) {
    const text = String(body?.body || body?.message || '').trim();
    if (!text || !body?.title) throw new BadRequestException('العنوان والنص مطلوبان');
    if (body?.user_id) {
      const doc = {
        id: uuid(), user_id: String(body.user_id), title: String(body.title), body: text,
        kind: 'admin_direct', read: false, createdAt: now(),
      };
      await this.conn.collection('notifications').insertOne(doc as any);
      return { ok: true, mode: 'direct', id: doc.id };
    }
    const doc = {
      id: uuid(), title: String(body.title), body: text,
      target_segments: body?.segment ? [String(body.segment)] : ['all'],
      status: 'scheduled', scheduled_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('admin_broadcasts').insertOne(doc as any);
    return { ok: true, mode: 'broadcast', id: doc.id };
  }

  @Get('auto-rules')
  async autoRules() {
    const rows = await this.conn.collection('notification_auto_rules').find({} as any).sort({ createdAt: -1 }).limit(200).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || String(r._id) }));
  }

  @Post('auto-rules')
  async createAutoRule(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.name || !body?.trigger) throw new BadRequestException('الاسم والمشغّل مطلوبان');
    const doc = {
      id: uuid(), name: String(body.name), trigger: String(body.trigger),
      template: body.template || null, channels: body.channels || ['push'],
      active: body.active !== false, created_by: uid(user), createdAt: now(), updatedAt: now(),
    };
    await this.conn.collection('notification_auto_rules').insertOne(doc as any);
    return doc;
  }

  @Put('auto-rules/:id')
  async updateAutoRule(@Param('id') id: string, @Body() body: any) {
    const allowed = ['name', 'trigger', 'template', 'channels', 'active'];
    const $set: any = { updatedAt: now() };
    for (const k of allowed) if (k in (body || {})) $set[k] = body[k];
    const res = await this.conn.collection('notification_auto_rules').updateOne(byId(id) as any, { $set });
    if (!res.matchedCount) throw new NotFoundException('القاعدة غير موجودة');
    return { ok: true };
  }

  @Delete('auto-rules/:id')
  async removeAutoRule(@Param('id') id: string) {
    const res = await this.conn.collection('notification_auto_rules').deleteOne(byId(id) as any);
    if (!res.deletedCount) throw new NotFoundException('القاعدة غير موجودة');
    return { ok: true };
  }
}

/* ── nursing services directory ──────────────────────────────────────────── */
@Controller('nursing-services')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminNursingServicesController extends AdminController {
  @Get()
  async list() {
    const rows = await this.conn.collection('nurse_providers').find({} as any).limit(300).toArray();
    return rows.map((n: any) => ({
      id: n.id || String(n._id), name: n.name || n.full_name,
      license: n.license_number || null, city: n.city || null,
      coverage_radius_km: n.coverage_radius_km ?? null, active: n.active !== false,
    }));
  }
}

/* ── insurance claims decisions (admin override on insurance-engine store) ─ */
@Controller('insurance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminInsuranceClaimsController extends AdminController {
  private async decide(id: string, user: any, approve: boolean, body: any) {
    const req: any = await this.conn.collection('insuranceservicerequests').findOne(byId(id) as any);
    if (!req) throw new NotFoundException('المطالبة غير موجودة');
    if (['COPAY_PAID', 'CANCELLED', 'EXPIRED'].includes(req.state)) {
      throw new BadRequestException(`لا يمكن اتخاذ قرار في حالة ${req.state}`);
    }
    const update: any = { decided_by: uid(user), decided_at: now(), updatedAt: now() };
    if (approve) {
      const pct = Number(body?.copay_percent) || 0;
      if (pct > 0 && pct < 100) {
        update.state = 'COPAY_PENDING';
        update.copay_percent = pct;
        update.copay_amount = Math.round((req.price || 0) * (pct / 100) * 100) / 100;
      } else {
        update.state = 'APPROVED_FULL';
        update.copay_percent = 0;
        update.copay_amount = 0;
      }
    } else {
      if (!String(body?.reason || '').trim()) throw new BadRequestException('سبب الرفض مطلوب');
      update.state = 'REJECTED';
      update.rejection_reason = String(body.reason).trim();
    }
    await this.conn.collection('insuranceservicerequests').updateOne(byId(id) as any, {
      $set: update,
      $push: { history: { state: update.state, at: now(), by: uid(user), note: body?.reason || 'admin decision' } } as any,
    });
    return { ok: true, id: req.id || id, state: update.state, copay_amount: update.copay_amount };
  }

  @Post('claims/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.decide(id, user, true, body);
  }

  @Post('claims/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { reason?: string }) {
    return this.decide(id, user, false, body);
  }
}

/* ── providers: sub-accounts of a parent provider ────────────────────────── */
@Controller('providers')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminProviderSubAccountsController extends AdminController {
  @Get(':id/sub-accounts')
  async subAccounts(@Param('id') id: string) {
    const rows = await this.conn.collection('provider_accounts')
      .find({ $or: [{ facility_id: id }, { parent_provider_id: id }, { parent_id: id }] } as any)
      .project({ id: 1, email: 1, full_name: 1, role: 1, ptype: 1, status: 1, facility_id: 1, createdAt: 1 })
      .limit(300).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), email: r.email, name: r.full_name,
      role: r.role || r.ptype, status: r.status, facility_id: r.facility_id, created_at: r.createdAt,
    }));
  }
}

/* ── medicines: admin shortage flagging ──────────────────────────────────── */
@Controller('medicines')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminMedicinesController extends AdminController {
  @Post(':id/shortage')
  async shortage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { reporter?: string; note?: string }) {
    let med: any = await this.conn.collection('medicines_master').findOne(byId(id) as any);
    let colName = 'medicines_master';
    if (!med) {
      med = await this.conn.collection('medicines').findOne(byId(id) as any);
      colName = 'medicines';
    }
    if (!med) throw new NotFoundException('الدواء غير موجود');
    await this.conn.collection(colName).updateOne(byId(id) as any, { $set: { shortage_flagged: true, updatedAt: now() } });
    const ins = await this.conn.collection('pharmacy_shortage_reports').insertOne({
      medicine_id: med.id || id, product_name: med.name_ar || med.name_en || null,
      reporter: body?.reporter || 'admin-console', note: body?.note || null,
      status: 'open', created_by: uid(user), createdAt: now(),
    } as any);
    return { ok: true, id: String(ins.insertedId) };
  }
}

/* ── bulk upload (CSV → medicines_master upsert) ─────────────────────────── */
@Controller('bulk-upload')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminBulkUploadController extends AdminController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@CurrentUser() user: any, @UploadedFile() file: any, @Body() body: any) {
    let rows: any[] = [];
    if (file?.buffer) {
      const text = file.buffer.toString('utf8');
      const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
      const headers = lines.shift()?.split(',').map((h: string) => h.trim().toLowerCase()) || [];
      for (const line of lines.slice(0, 1000)) {
        const cells = line.split(',').map((c: string) => c.trim());
        const row: any = {};
        headers.forEach((h: string, i: number) => { row[h] = cells[i] ?? ''; });
        if (row.name_ar || row.name_en || row.name) rows.push(row);
      }
    } else if (Array.isArray(body?.rows)) {
      rows = body.rows.slice(0, 1000);
    } else if (Array.isArray(body)) {
      rows = (body as any[]).slice(0, 1000);
    }
    if (!rows.length) throw new BadRequestException('ملف CSV أو مصفوفة صفوف مطلوبة');
    let inserted = 0, updated = 0;
    for (const r of rows) {
      const nameAr = r.name_ar || r.name || null;
      const nameEn = r.name_en || null;
      if (!nameAr && !nameEn) continue;
      const doc = {
        name_ar: nameAr, name_en: nameEn, generic_name: r.generic_name || null,
        price: Number(r.price) || 0, category: r.category || null,
        stock: Number(r.stock) || 0, status: 'active', updatedAt: now(),
      };
      const key = r.id ? { id: String(r.id) } : { name_ar: nameAr };
      const res = await this.conn.collection('medicines_master').updateOne(
        key as any,
        { $set: doc, $setOnInsert: { id: r.id ? String(r.id) : uuid(), createdAt: now(), created_by: uid(user) } },
        { upsert: true },
      );
      if (res.upsertedCount) inserted++; else updated++;
    }
    return { ok: true, received: rows.length, inserted, updated };
  }
}

/* ── home-care nursing queue (per-nurse view) ────────────────────────────── */
@Controller('home-care')
@UseGuards(JwtAuthGuard)
class AdminNursingMyController extends AdminController {
  @Get('bookings/nursing/my')
  async my(@CurrentUser() user: any, @Query('nurse_id') nurseId?: string) {
    const target = String(nurseId || uid(user));
    const rows = await this.conn.collection('homecarebookings')
      .find({ $or: [{ provider_id: target }, { nurse_id: target }, { provider_account_id: target }] } as any)
      .sort({ createdAt: -1 }).limit(200).toArray();
    return rows.map((b: any) => ({
      id: b.id || String(b._id), patient_id: b.patient_id, state: b.state || b.status,
      service: b.service_name || b.service_id, address: b.address,
      scheduled_at: b.scheduled_at, created_at: b.createdAt,
    }));
  }
}

/* ── system configuration singletons ─────────────────────────────────────── */
const DEFAULT_PERMISSIONS = [
  { role: 'super_admin', permissions: ['*'] },
  { role: 'admin', permissions: ['providers.manage', 'orders.manage', 'finance.view', 'content.manage', 'notifications.send'] },
  { role: 'support', permissions: ['tickets.manage', 'users.view'] },
  { role: 'finance', permissions: ['finance.view', 'refunds.manage', 'payouts.manage'] },
];
const DEFAULT_WORKFLOWS = [
  { key: 'provider_onboarding', steps: ['register', 'verify_email', 'profile', 'kyc', 'bank', 'submit', 'admin_review', 'active'] },
  { key: 'pharmacy_order', steps: ['created', 'dispatched', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'] },
  { key: 'consultation', steps: ['booked', 'confirmed', 'checked_in', 'in_progress', 'completed'] },
  { key: 'insurance_claim', steps: ['submitted', 'provider_review', 'decision', 'copay_payment', 'service_start'] },
];
const DEFAULT_THEME = {
  primary: '#0E7C7B', accent: '#F0A526', danger: '#D64550',
  background: '#F6F8FA', text: '#101828', radius: 12, font: 'Tajawal',
};
const DEFAULT_AI_CONFIG = {
  triage_model: 'nabd-triage-v2', symptom_confidence_threshold: 0.65,
  red_flag_escalation: true, max_suggestions: 3, languages: ['ar', 'en'],
};

@Controller('system')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminSystemController extends AdminController {
  private async getConfig(key: string, fallback: any) {
    const doc = await this.conn.collection('system_config').findOne({ key } as any);
    return doc?.value ?? fallback;
  }
  private async putConfig(key: string, value: any, user: any) {
    await this.conn.collection('system_config').updateOne(
      { key } as any,
      { $set: { key, value, updated_by: uid(user), updatedAt: now() } },
      { upsert: true },
    );
    return { ok: true };
  }

  @Get('theme') theme() { return this.getConfig('theme', DEFAULT_THEME); }
  @Put('theme') putTheme(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('theme', b || {}, u); }

  @Get('permissions') permissions() { return this.getConfig('permissions', DEFAULT_PERMISSIONS); }
  @Put('permissions') putPermissions(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('permissions', b || [], u); }

  @Get('workflows') workflows() { return this.getConfig('workflows', DEFAULT_WORKFLOWS); }
  @Put('workflows') putWorkflows(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('workflows', b || [], u); }

  @Get('ai-config') aiConfig() { return this.getConfig('ai-config', DEFAULT_AI_CONFIG); }
  @Put('ai-config') putAiConfig(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('ai-config', b || {}, u); }

  @Get('alert-rules') alertRules() { return this.getConfig('alert-rules', []); }
  @Put('alert-rules') putAlertRules(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('alert-rules', b || [], u); }
}

/* ── analytics ───────────────────────────────────────────────────────────── */
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminAnalyticsController extends AdminController {
  @Get('overview')
  async overview() {
    const since = new Date(Date.now() - 30 * 86400000);
    const [usersByDay, ordersByDay, apptsByDay] = await Promise.all([
      this.conn.collection('users').aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).toArray(),
      this.conn.collection('orders').aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total', 0] } } } },
        { $sort: { _id: 1 } },
      ]).toArray(),
      this.conn.collection('appointments').aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).toArray(),
    ]);
    return {
      window_days: 30,
      new_users_by_day: usersByDay.map((r: any) => ({ day: r._id, count: r.count })),
      orders_by_day: ordersByDay.map((r: any) => ({ day: r._id, count: r.count, revenue: r.revenue })),
      appointments_by_day: apptsByDay.map((r: any) => ({ day: r._id, count: r.count })),
    };
  }

  @Get('heatmap')
  async heatmap() {
    const [byCityAppts, byCityOrders] = await Promise.all([
      this.conn.collection('appointments').aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 30 },
      ]).toArray(),
      this.conn.collection('orders').aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 30 },
      ]).toArray(),
    ]);
    const merged = new Map<string, number>();
    for (const r of byCityAppts) if (r._id) merged.set(r._id, (merged.get(r._id) || 0) + r.count);
    for (const r of byCityOrders) if (r._id) merged.set(r._id, (merged.get(r._id) || 0) + r.count);
    return [...merged.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  }

  @Post('custom-report')
  async customReport(@Body() body: { entity?: string; from?: string; to?: string }) {
    const entity = String(body?.entity || 'orders');
    const allowed: Record<string, string> = {
      orders: 'orders', appointments: 'appointments', users: 'users',
      insurance: 'insuranceservicerequests', emergencies: 'emergencyrequests',
      // provider-less feature reports — every session reaches the admin console
      triage: 'ai_triage_sessions', assessments: 'self_assessments',
    };
    const colName = allowed[entity];
    if (!colName) throw new BadRequestException(`entity must be one of: ${Object.keys(allowed).join(', ')}`);
    const match: any = {};
    if (body?.from || body?.to) {
      match.createdAt = {};
      if (body.from) match.createdAt.$gte = new Date(body.from);
      if (body.to) match.createdAt.$lte = new Date(body.to);
    }
    const [total, byDay, byStatus] = await Promise.all([
      this.conn.collection(colName).countDocuments(match),
      this.conn.collection(colName).aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }, { $limit: 90 },
      ]).toArray(),
      this.conn.collection(colName).aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$status', '$state', '$urgency', '$severity'] }, count: { $sum: 1 } } },
      ]).toArray(),
    ]);
    return {
      entity, from: body?.from || null, to: body?.to || null, total,
      by_day: byDay.map((r: any) => ({ day: r._id, count: r.count })),
      by_status: byStatus.map((r: any) => ({ status: r._id || 'unknown', count: r.count })),
    };
  }
}

/* ── admin nursing portal (admin-web) ────────────────────────────────────── */
@Controller('admin/nursing')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
class AdminNursingPortalController extends AdminController {
  @Get('requests')
  async requests() {
    throw new ServiceUnavailableException('admin nursing operations are unavailable pending eligible-provider, acceptance, minimum-PHI and audit workflow approval');
  }

  @Post('requests/:id/assign')
  async assign(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { provider_id?: string; nurse_id?: string }) {
    throw new ServiceUnavailableException('admin nursing assignment is unavailable pending eligible-provider, acceptance, minimum-PHI and audit workflow approval');
  }
}

/* ── module registration ─────────────────────────────────────────────────── */
@Module({
  controllers: [
    AdminNursingPortalController,
    AdminDashboardController,
    AdminBroadcastController,
    AdminEmergencyController,
    AdminContractsController,
    AdminShiftsController,
    AdminScorecardController,
    AdminComplianceController,
    AdminTransportController,
    AdminFamilyCardsController,
    AdminBlacklistController,
    AdminFraudController,
    AdminAdminsController,
    AdminWaitlistController,
    AdminReferralsController,
    AdminTasksController,
    AdminSpecialtiesController,
    AdminServicesController,
    AdminComplaintsController,
    AdminCmsController,
    AdminBannersController,
    AdminOrdersController,
    AdminFinancialController,
    AdminCommissionsController,
    AdminRefundsController,
    AdminCouponsController,
    AdminLoyaltyController,
    AdminDeliveryController,
    DeliveryCheckController,
    AdminPromotionsController,
    PromotionsApplicableController,
    AdminNotificationsController,
    AdminNursingServicesController,
    AdminInsuranceClaimsController,
    AdminProviderSubAccountsController,
    AdminMedicinesController,
    AdminBulkUploadController,
    AdminNursingMyController,
    AdminSystemController,
    AdminAnalyticsController,
  ],
})
export class AdminSpaModule {}
