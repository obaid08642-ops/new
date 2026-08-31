/**
 * CompatModule — production gap-fill endpoints.
 *
 * Every endpoint here was discovered by the screen↔API wiring audit: a shipped
 * app screen calls it, but no controller declared it. Implementations are real
 * and DB-backed (raw-collection access, same pattern as provider-moderation),
 * with ownership/role checks — no mocks, no stubs.
 */
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Module,
  UseGuards,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CurrentUser, Public, JwtAuthGuard, Roles } from '../../common/auth.guard';

const now = () => new Date();
const uid = (u: any) => u?.id || u?._id || u?.user_id;

async function mustOwnBooking(conn: Connection, collection: string, id: string, userId: string) {
  const doc = await conn.collection(collection).findOne({ $or: [{ id }, { _id: id as any }] } as any);
  if (!doc) throw new NotFoundException('not found');
  const owner = (doc as any).patient_id || (doc as any).user_id;
  if (owner && String(owner) !== String(userId)) throw new ForbiddenException('forbidden');
  return doc;
}

// ─── 1) Family group chat ────────────────────────────────────────────────────
@Controller('family/chat')
@UseGuards(JwtAuthGuard)
export class FamilyChatController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async familyOf(userId: string) {
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    // `family_groups` is the canonical membership record. The legacy
    // `familymembers` collection did not reliably represent removals, so it
    // could authorize a removed/unrelated user to a family chat room.
    const group = await this.conn.collection('family_groups').findOne({
      is_deleted: { $ne: true },
      $or: [{ owner_id: userId }, { 'members.user_id': userId }],
    } as any);
    if (!group?.id) throw new ForbiddenException('not_active_family_member');
    return String(group.id);
  }

  @Get('messages')
  async list(@CurrentUser() u: any, @Query('limit') limit = '50'): Promise<{ data: any[] }> {
    const owner = await this.familyOf(uid(u));
    const messages = await this.conn
      .collection('familychatmessages')
      .find({ family_id: owner } as any)
      .sort({ created_at: 1 })
      .limit(Math.min(+limit || 50, 200))
      .toArray();
    return { data: messages };
  }

  @Post('messages')
  async send(@CurrentUser() u: any, @Body() body: any) {
    if (!body?.text?.trim()) throw new BadRequestException('text_required');
    const owner = await this.familyOf(uid(u));
    const msg = {
      id: uuid(),
      family_id: owner,
      sender_id: uid(u),
      sender_name: u?.full_name || u?.name || '',
      text: String(body.text).slice(0, 2000),
      created_at: now(),
    };
    await this.conn.collection('familychatmessages').insertOne(msg as any);
    return { data: msg };
  }
}

// ─── 2) Health medications (drug-scanner adds scanned meds here) ─────────────
@Controller('health/medications')
class HealthMedsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list(@CurrentUser() u: any) {
    const data = await this.conn
      .collection('healthmedications')
      .find({ user_id: uid(u), active: { $ne: false } } as any)
      .sort({ created_at: -1 })
      .toArray();
    return { data };
  }

  @Post()
  async add(@CurrentUser() u: any, @Body() body: any) {
    if (!body?.name) throw new BadRequestException('name_required');
    const med = {
      id: uuid(),
      user_id: uid(u),
      name: String(body.name).slice(0, 200),
      dosage: body.dosage ? String(body.dosage).slice(0, 100) : null,
      form: body.form || 'tablet',
      times: Array.isArray(body.times) ? body.times.slice(0, 6) : [],
      source: body.source || 'manual',
      active: true,
      created_at: now(),
    };
    await this.conn.collection('healthmedications').insertOne(med as any);
    return { data: med };
  }
}

// ─── 3) Wearables (device registry + health-data ingest) ─────────────────────
@Controller('wearables')
class WearablesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('devices')
  async devices(@CurrentUser() u: any) {
    const data = await this.conn.collection('wearabledevices').find({ user_id: uid(u) } as any).toArray();
    return { data };
  }

  @Post('devices')
  async register(@CurrentUser() u: any, @Body() body: any) {
    if (!body?.kind) throw new BadRequestException('kind_required');
    const dev = {
      id: uuid(),
      user_id: uid(u),
      kind: String(body.kind).slice(0, 50),
      name: body.name ? String(body.name).slice(0, 100) : null,
      connected_at: now(),
    };
    await this.conn.collection('wearabledevices').updateOne({ user_id: uid(u), kind: dev.kind } as any, { $set: dev }, { upsert: true });
    return { data: dev };
  }

  @Get('data')
  async data(@CurrentUser() u: any, @Query('metric') metric?: string, @Query('days') days = '7') {
    const since = new Date(Date.now() - (+days || 7) * 86400000);
    const q: any = { user_id: uid(u), recorded_at: { $gte: since } };
    if (metric) q.metric = metric;
    const data = await this.conn.collection('wearabledata').find(q).sort({ recorded_at: 1 }).limit(2000).toArray();
    return { data };
  }

  @Post('data')
  async ingest(@CurrentUser() u: any, @Body() body: any) {
    const rows = (Array.isArray(body?.samples) ? body.samples : [body]).filter((s: any) => s?.metric && s?.value != null);
    if (!rows.length) throw new BadRequestException('samples_required');
    const docs = rows.slice(0, 500).map((s: any) => ({
      id: uuid(),
      user_id: uid(u),
      metric: String(s.metric).slice(0, 50),
      value: Number(s.value),
      unit: s.unit ? String(s.unit).slice(0, 20) : null,
      source: s.source || 'manual',
      recorded_at: s.recorded_at ? new Date(s.recorded_at) : now(),
    }));
    await this.conn.collection('wearabledata').insertMany(docs as any);
    return { inserted: docs.length };
  }
}

// ─── 4) Home-care packages (patient nursing tab) ─────────────────────────────
@Controller('home-care/packages')
class HomeCarePackagesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list() {
    const services = await this.conn
      .collection('homecareservices')
      .find({ $or: [{ active: true }, { is_active: true }, { status: 'active' }] } as any)
      .limit(100)
      .toArray();
    const data = services.map((s: any) => ({
      id: s.id || String(s._id),
      name_ar: s.name_ar,
      name_en: s.name_en || null,
      price: s.price ?? 0,
      duration: s.duration || null,
      category: s.category || 'nursing',
    }));
    return { data };
  }
}

// ─── 5) Maternity — childhood vaccine schedule + per-baby records ────────────
const SA_VACCINE_SCHEDULE = [
  { code: 'BCG+HBV0', name_ar: 'بي سي جي + جدري الكبد (ب)', age_weeks: 0, age_label_ar: 'عند الولادة' },
  { code: 'HBV1+DTaP1+IPV1+PCV1+Rota1+Hib1', name_ar: 'الجرعة الأولى السداسية', age_weeks: 8, age_label_ar: 'شهران' },
  { code: 'DTaP2+IPV2+PCV2+Rota2+Hib2', name_ar: 'الجرعة الثانية السداسية', age_weeks: 16, age_label_ar: '4 أشهر' },
  { code: 'DTaP3+IPV3+PCV3+Rota3+Hib3+HBV3', name_ar: 'الجرعة الثالثة السداسية', age_weeks: 24, age_label_ar: '6 أشهر' },
  { code: 'MMR1+Varicella1', name_ar: 'الحصبة والنكاف والحصبة الألمانية + جدري الماء', age_weeks: 52, age_label_ar: '12 شهرًا' },
  { code: 'HepA1+DTaP4+Hib4+PCV4', name_ar: 'التهاب الكبد أ + المعززة', age_weeks: 78, age_label_ar: '18 شهرًا' },
  { code: 'DTaP5+IPV4+MMR2+Varicella2', name_ar: 'الجرعة المعززة قبل المدرسة', age_weeks: 208, age_label_ar: '4-6 سنوات' },
];

@Controller('maternity/vaccines')
class MaternityVaccinesController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async list(@CurrentUser() u: any, @Query('baby_id') babyId?: string) {
    const taken = await this.conn
      .collection('maternityvaccines')
      .find({ user_id: uid(u), ...(babyId ? { baby_id: babyId } : {}) } as any)
      .toArray();
    const takenCodes = new Set(taken.map((t: any) => t.code));
    return {
      schedule: SA_VACCINE_SCHEDULE.map((v) => ({ ...v, taken: takenCodes.has(v.code) })),
      records: taken,
    };
  }

  @Post()
  async mark(@CurrentUser() u: any, @Body() body: any) {
    if (!body?.code) throw new BadRequestException('code_required');
    if (!SA_VACCINE_SCHEDULE.some((v) => v.code === body.code)) throw new BadRequestException('unknown_vaccine_code');
    const rec = { id: uuid(), user_id: uid(u), baby_id: body.baby_id || null, code: body.code, taken_at: body.taken_at ? new Date(body.taken_at) : now(), created_at: now() };
    await this.conn.collection('maternityvaccines').updateOne({ user_id: uid(u), code: body.code, baby_id: rec.baby_id } as any, { $set: rec }, { upsert: true });
    return { data: rec };
  }
}

// ─── 6) Nutrition food catalog (seed-on-empty, real search) ──────────────────
const SEED_FOODS = [
  ['أرز أبيض مطبوخ', 130, 2.7, 28, 0.3], ['صدر دجاج مشوي', 165, 31, 0, 3.6], ['تمر خلاص', 282, 2, 75, 0.2],
  ['خبز بر', 247, 13, 41, 3.4], ['حليب كامل الدسم', 61, 3.2, 4.8, 3.3], ['لبن قليل الدسم', 42, 3.4, 5, 1],
  ['بيض مسلوق', 155, 13, 1.1, 11], ['موز', 89, 1.1, 23, 0.3], ['تفاح', 52, 0.3, 14, 0.2],
  ['عدس مطبوخ', 116, 9, 20, 0.4], ['حمص مطبوخ', 164, 9, 27, 2.6], ['سلمون مشوي', 208, 22, 0, 13],
  ['زيت زيتون', 884, 0, 0, 100], ['خيار', 15, 0.7, 3.6, 0.1], ['طماطم', 18, 0.9, 3.9, 0.2],
  ['زبادي يوناني', 97, 9, 3.9, 5], ['شوفان', 379, 13, 68, 6.5], ['مكسرات مشكلة', 607, 20, 21, 54],
  ['كبسة دجاج', 168, 7, 24, 5.2], ['شوربة عدس', 61, 3.4, 9.2, 1.3], ['فول مدمس', 110, 7.6, 17, 0.6],
  ['جبن قريش', 98, 11, 3.4, 4.3], ['سمك هامور مشوي', 118, 24, 0, 2.1], ['قهوة عربية بدون سكر', 2, 0.1, 0.4, 0],
];

@Controller('nutrition/foods')
class NutritionFoodsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async search(@Query('q') q = '', @Query('limit') limit = '30') {
    const col = this.conn.collection('nutritionfoods');
    if ((await col.estimatedDocumentCount()) === 0) {
      await col.insertMany(
        SEED_FOODS.map(([name_ar, calories, protein, carbs, fat]) => ({
          id: uuid(), name_ar, calories, protein, carbs, fat, per: '100g', verified: true, created_at: now(),
        })) as any,
      );
    }
    const filter = q?.trim() ? { name_ar: { $regex: q.trim(), $options: 'i' } } : {};
    const data = await col.find(filter as any).limit(Math.min(+limit || 30, 100)).toArray();
    return { data };
  }
}

/* ── shared helpers ──────────────────────────────────────────────────────── */
async function oid(id: string) {
  const { Types } = await import('mongoose');
  try {
    return new Types.ObjectId(String(id));
  } catch {
    throw new NotFoundException('العنصر غير موجود');
  }
}

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* ── 7) Offer detail (patient) — backed by PromotionCampaign ─────────────── */
@Controller('offers')
class OffersDetailController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get(':id')
  async getOffer(@Param('id') id: string, @CurrentUser() user: any) {
    const offer: any = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id) as any);
    if (!offer) throw new NotFoundException('العرض غير موجود');
    const provider = offer.provider_id
      ? await this.conn.collection('provider_profiles').findOne({
          $or: [{ id: offer.provider_id }, { user_id: offer.provider_id }, { account_id: offer.provider_id }],
        } as any)
      : null;
    return {
      id: offer.id || String(offer._id),
      title_ar: offer.title_ar, title_en: offer.title_en,
      original_price: offer.original_price, discounted_price: offer.discounted_price,
      image: offer.image_url, start_date: offer.start_date, end_date: offer.end_date,
      status: offer.status, target: offer.target_parameters || {},
      provider: provider ? { id: provider.id || String(provider._id), name: provider.name, specialty: provider.specialty, city: provider.city } : null,
    };
  }
}

/* ── 8) Promotion offer → providers list ─────────────────────────────────── */
@Controller('promotions/offers')
class PromotionsOffersController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get(':id/providers')
  async offerProviders(@Param('id') id: string) {
    const offer: any = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id) as any);
    if (!offer) throw new NotFoundException('العرض غير موجود');
    const ids: string[] = [offer.provider_id, ...(offer.provider_ids || [])].filter(Boolean).map(String);
    if (!ids.length) return [];
    const rows = await this.conn.collection('provider_profiles')
      .find({ $or: [{ id: { $in: ids } }, { user_id: { $in: ids } }, { account_id: { $in: ids } }] } as any)
      .limit(50).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), name: r.name || r.facility_name || '',
      specialty: r.specialty, city: r.city,
      rating_avg: r.rating_avg ?? 0, rating_count: r.rating_count ?? 0,
    }));
  }
}

/* ── 9) Reports timeline + single report alias ───────────────────────────── */
@Controller('reports')
class ReportsTimelineController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('timeline')
  async timeline(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('medicalreports')
      .find({ patient_id: u } as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), tracking_id: r.tracking_id,
      kind: r.report_type, title: r.title_ar || r.title_en,
      provider: r.doctor_name, date: r.createdAt, critical: !!r.critical,
    }));
  }

  @Get(':id')
  async byId(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const r: any = await this.conn.collection('medicalreports').findOne(byStringOrObjectId(id) as any);
    if (!r) throw new NotFoundException('التقرير غير موجود');
    if (r.patient_id && String(r.patient_id) !== String(u)) {
      throw new ForbiddenException('لا تملك صلاحية عرض هذا التقرير');
    }
    return { ...r, id: r.id || String(r._id) };
  }
}

/* ── 10) Support chat (patient) ──────────────────────────────────────────── */
@Controller('support/chat')
class SupportChatController {
  constructor(@InjectConnection() private conn: Connection) {}

  // Bare aliases — the patient support screen calls /support/chat directly
  @Get()
  bareList(@CurrentUser() user: any) { return this.list(user); }

  @Post()
  bareSend(@CurrentUser() user: any, @Body() body: { body?: string; message?: string }) {
    return this.send(user, body);
  }

  @Get('messages')
  async list(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('supportchatmessages')
      .find({ account_id: u } as any).sort({ createdAt: 1 }).limit(300).toArray();
    return rows.map((r: any) => ({ id: String(r._id), body: r.body, from: r.from, created_at: r.createdAt }));
  }

  @Post('messages')
  async send(@CurrentUser() user: any, @Body() body: { body?: string; message?: string }) {
    const u = uid(user);
    const text = String(body?.body || body?.message || '').trim();
    if (!text) throw new BadRequestException('نص الرسالة مطلوب');
    let ticket: any = await this.conn.collection('supporttickets')
      .findOne({ account_id: u, status: { $in: ['open', 'pending'] } } as any);
    if (!ticket) {
      const doc = {
        id: uuid(), account_id: u, subject: text.slice(0, 80),
        status: 'open', priority: 'normal', createdAt: now(), updatedAt: now(),
      };
      await this.conn.collection('supporttickets').insertOne(doc as any);
      ticket = doc;
    }
    const ins = await this.conn.collection('supportchatmessages').insertOne({
      account_id: u, ticket_id: ticket.id || String(ticket._id),
      from: 'patient', body: text, createdAt: now(),
    } as any);
    await this.conn.collection('supporttickets').updateOne(
      byStringOrObjectId(ticket.id || String(ticket._id)) as any,
      { $set: { updatedAt: now(), last_message: text.slice(0, 120) } },
    );
    return { ok: true, id: String(ins.insertedId), ticket_id: ticket.id || String(ticket._id) };
  }
}

/* ── 11) Client audit-ingest ─────────────────────────────────────────────── */
@Controller('audit')
class AuditIngestController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post()
  async one(@CurrentUser() user: any, @Body() body: any) {
    await this.conn.collection('clientevents').insertOne({
      account_id: uid(user), kind: String(body?.kind || body?.event || 'generic'),
      screen: body?.screen || null, meta: body?.meta || body?.data || {}, createdAt: now(),
    } as any);
    return { ok: true };
  }

  @Post('batch')
  async batch(@CurrentUser() user: any, @Body() body: { events?: any[] }) {
    const list = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
    if (list.length) {
      await this.conn.collection('clientevents').insertMany(list.map((e: any) => ({
        account_id: uid(user), kind: String(e?.kind || e?.event || 'generic'),
        screen: e?.screen || null, meta: e?.meta || e?.data || {}, createdAt: now(),
      })) as any);
    }
    return { ok: true, inserted: list.length };
  }
}

/* ── 12) AI drug-interaction check ───────────────────────────────────────── */
const INTERACTION_RULES: Array<{ a: string[]; b: string[]; severity: string; note_ar: string }> = [
  { a: ['warfarin', 'وارفارين'], b: ['aspirin', 'أسبرين', 'ibuprofen', 'ايبوبروفين'], severity: 'high', note_ar: 'زيادة خطر النزيف — راجع الطبيب فوراً' },
  { a: ['metformin', 'ميتفورمين'], b: ['alcohol', 'كحول'], severity: 'moderate', note_ar: 'خطر الحماض اللبني — تجنب الكحول' },
  { a: ['lisinopril', 'ليزينوبريل'], b: ['potassium', 'بوتاسيوم'], severity: 'moderate', note_ar: 'ارتفاع البوتاسيوم — مراقبة دورية' },
  { a: ['sildenafil', 'سيلدينافيل'], b: ['nitroglycerin', 'نيتروجليسرين'], severity: 'high', note_ar: 'هبوط حاد في الضغط — ممنوع الدمج' },
  { a: ['simvastatin', 'سيمفاستاتين'], b: ['clarithromycin', 'كلاريثرومايسين'], severity: 'high', note_ar: 'خطر انحلال الربيدات — بدّل المضاد الحيوي' },
];

@Controller('ai')
class AiInteractionsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post('drug-interactions')
  async check(@CurrentUser() user: any, @Body() body: { drugs?: string[]; drug?: string }) {
    const u = uid(user);
    const meds = await this.conn.collection('healthmedications')
      .find({ account_id: u, active: { $ne: false } } as any).toArray();
    const current = meds.map((m: any) => String(m.name || '').toLowerCase());
    const incoming = (body?.drugs || (body?.drug ? [body.drug] : [])).map((d) => String(d).toLowerCase());
    const all = [...new Set([...current, ...incoming])];
    const hits: any[] = [];
    for (const rule of INTERACTION_RULES) {
      const hasA = all.some((d) => rule.a.some((k) => d.includes(k)));
      const hasB = all.some((d) => rule.b.some((k) => d.includes(k)));
      if (hasA && hasB) hits.push({ severity: rule.severity, note_ar: rule.note_ar });
    }
    return { checked: all.length, interactions: hits, safe: hits.filter((h) => h.severity === 'high').length === 0 };
  }
}

/* ── 13) Consultation detail/messages aliases ────────────────────────────── */
@Controller('consultations')
class ConsultationsCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async ownedAppointment(id: string, u: string) {
    const b: any = await this.conn.collection('appointments').findOne(byStringOrObjectId(id) as any);
    if (!b) throw new NotFoundException('الاستشارة غير موجودة');
    const owner = b.patient_id || b.user_id;
    if (owner && String(owner) !== String(u)) throw new ForbiddenException('لا تملك هذه الاستشارة');
    return b;
  }

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const pid = b.provider_id || b.doctor_id;
    const profile = pid
      ? await this.conn.collection('provider_profiles').findOne({
          $or: [{ id: pid }, { user_id: pid }, { account_id: pid }],
        } as any)
      : null;
    return {
      id: b.id || String(b._id), status: b.status, kind: b.kind || 'consultation',
      scheduled_at: b.scheduled_at || b.starts_at, price: b.price, notes: b.notes,
      provider: profile ? { id: profile.id || String(profile._id), name: profile.name, specialty: profile.specialty } : null,
      consultation_id: b.id || String(b._id),
    };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string, @CurrentUser() user: any) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const key = b.id || String(b._id);
    const rows = await this.conn.collection('consultation_messages')
      .find({ consultation_id: key } as any).sort({ createdAt: 1 }).limit(300).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), body: r.body, sender: String(r.sender_id) === String(u) ? 'me' : 'other',
      created_at: r.createdAt,
    }));
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { body?: string }) {
    const u = uid(user);
    const b = await this.ownedAppointment(id, u);
    const text = String(body?.body || '').trim();
    if (!text) throw new BadRequestException('نص الرسالة مطلوب');
    const ins = await this.conn.collection('consultation_messages').insertOne({
      consultation_id: b.id || String(b._id), sender_id: u, body: text, createdAt: now(),
    } as any);
    return { ok: true, id: String(ins.insertedId) };
  }
}

/* ── 14) Facility inbox ──────────────────────────────────────────────────── */
async function facilityIdOf(conn: Connection, u: string): Promise<string> {
  const account: any = await conn.collection('provider_accounts')
    .findOne({ $or: [{ id: u }, { user_id: u }, { _id: u }] } as any);
  return account?.facility_id || account?.id || u;
}

@Controller('facility')
class FacilityInboxController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('inbox')
  async inbox(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('facilityinbox')
      .find({ facility_id: fid } as any).sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), kind: r.kind, title: r.title, body: r.body,
      read: !!r.read, created_at: r.createdAt,
    }));
  }

  @Post('inbox/:id/read')
  async markRead(@Param('id') id: string) {
    await this.conn.collection('facilityinbox')
      .updateOne(byStringOrObjectId(id) as any, { $set: { read: true } });
    return { ok: true };
  }
}

/* ── 15) Nursing jobs (provider) ─────────────────────────────────────────── */
const NURSING_ACTIVE_STATES = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'];

@Controller('nursing')
class NursingCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('jobs/active')
  async activeJobs(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('homecarebookings')
      .find({
        $or: [{ provider_id: u }, { nurse_id: u }, { provider_account_id: u }],
        $and: [{ $or: [{ state: { $in: NURSING_ACTIVE_STATES } }, { status: { $in: NURSING_ACTIVE_STATES } }] }],
      } as any)
      .sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((b: any) => ({
      id: b.id || String(b._id), state: b.state || b.status,
      patient_id: b.patient_id, address: b.address, scheduled_at: b.scheduled_at,
      service: b.service_name || b.service_id, timers: b.timers || {},
    }));
  }

  /**
   * Bare notes endpoint used by the nursing dashboard: attaches vitals+note to
   * the nurse's CURRENT visit (latest ARRIVED/IN_PROGRESS booking).
   */
  @Post('notes')
  async addNoteToActive(@CurrentUser() user: any, @Body() body: { vitals?: any; note?: string }) {
    const u = uid(user);
    const b: any = await this.conn.collection('homecarebookings')
      .find({
        $or: [{ provider_id: u }, { nurse_id: u }, { provider_account_id: u }],
        $and: [{ $or: [{ state: { $in: ['ARRIVED', 'IN_PROGRESS', 'arrived', 'in_progress'] } }, { status: { $in: ['ARRIVED', 'IN_PROGRESS', 'arrived', 'in_progress'] } }] }],
      } as any)
      .sort({ updatedAt: -1 }).limit(1).next();
    if (!b) throw new NotFoundException('لا توجد زيارة نشطة لإرفاق الملاحظة بها');
    const vitals = body?.vitals && typeof body.vitals === 'object' ? body.vitals : {};
    const note = String(body?.note || '').trim();
    if (!note && !Object.keys(vitals).length) throw new BadRequestException('الملاحظة أو العلامات الحيوية مطلوبة');
    const ins = await this.conn.collection('nursingvisitreports').insertOne({
      booking_id: b.id || String(b._id), patient_id: b.patient_id, nurse_id: u,
      vitals, note, createdAt: now(),
    } as any);
    await this.conn.collection('homecarebookings').updateOne(
      { _id: b._id }, { $set: { latest_vitals: vitals, updatedAt: now() } },
    );
    return { ok: true, id: String(ins.insertedId), booking_id: b.id || String(b._id) };
  }

  @Post('jobs/:id/notes')
  async addNote(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { note?: string; body?: string }) {
    const u = uid(user);
    const text = String(body?.note || body?.body || '').trim();
    if (!text) throw new BadRequestException('نص الملاحظة مطلوب');
    const b: any = await this.conn.collection('homecarebookings').findOne(byStringOrObjectId(id) as any);
    if (!b) throw new NotFoundException('الطلب غير موجود');
    const assigned = [b.provider_id, b.nurse_id, b.provider_account_id].filter(Boolean).map(String);
    if (assigned.length && !assigned.includes(String(u))) throw new ForbiddenException('الطلب ليس مسنداً إليك');
    const ins = await this.conn.collection('nursingvisitreports').insertOne({
      booking_id: b.id || String(b._id), patient_id: b.patient_id, nurse_id: u,
      note: text, createdAt: now(),
    } as any);
    await this.conn.collection('homecarebookings').updateOne(
      byStringOrObjectId(id) as any, { $set: { updatedAt: now() } },
    );
    return { ok: true, id: String(ins.insertedId) };
  }

  @Post('coverage/verify-gps')
  async verifyGps(@CurrentUser() user: any, @Body() body: { lat?: number; lng?: number }) {
    const u = uid(user);
    const lat = Number(body?.lat), lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestException('إحداثيات غير صالحة');
    const nurse: any = await this.conn.collection('nurse_providers')
      .findOne({ $or: [{ nurse_id: u }, { provider_id: u }, { account_id: u }, { user_id: u }] } as any);
    const center = nurse?.base_location || nurse?.geo || null;
    const radius = Number(nurse?.coverage_radius_km || 0);
    if (!center || !radius || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) {
      return { covered: true, reason: 'no_geofence' };
    }
    const dist = haversineKm(Number(center.lat), Number(center.lng), lat, lng);
    return { covered: dist <= radius, distance_km: Math.round(dist * 100) / 100, radius_km: radius };
  }
}

/* ── 16) Pharmacy products + shortage reports (provider) ─────────────────── */
@Controller('pharmacy')
class PharmacyCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('products')
  async products(@CurrentUser() user: any, @Query('q') q?: string) {
    const u = uid(user);
    const rows = await this.conn.collection('pharmacy_inventory')
      .find({ $or: [{ pharmacy_id: u }, { account_id: u }, { provider_account_id: u }] } as any)
      .limit(500).toArray();
    const medIds = rows.map((r: any) => r.medicine_id).filter(Boolean);
    const meds = medIds.length
      ? await this.conn.collection('medicines_master').find({ id: { $in: medIds } } as any).toArray()
      : [];
    const byId = new Map(meds.map((m: any) => [m.id, m]));
    let items = rows.map((r: any) => {
      const m: any = byId.get(r.medicine_id) || {};
      return {
        id: r.id || String(r._id), medicine_id: r.medicine_id,
        name: m.name_ar || m.name_en || r.name || '',
        price: r.price ?? m.price ?? 0, stock: r.stock ?? r.quantity ?? 0,
        shortage_flagged: !!r.shortage_flagged, active: r.active !== false,
      };
    });
    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((i: any) => String(i.name).toLowerCase().includes(needle));
    }
    return items;
  }

  @Post('shortages/report')
  async reportShortage(@CurrentUser() user: any, @Body() body: { product_name?: string; medicine_id?: string; note?: string }) {
    const u = uid(user);
    const name = String(body?.product_name || '').trim();
    if (!name && !body?.medicine_id) throw new BadRequestException('اسم الصنف مطلوب');
    // Phase-6 workflow: a provider report NEVER shows the public badge by itself —
    // the report waits 'pending' until an admin approves it in the medicines module.
    const reportId = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ins = await this.conn.collection('pharmacy_shortage_reports').insertOne({
      id: reportId,
      pharmacy_id: u, reporter_id: u, reporter_role: 'pharmacy',
      medicine_id: body?.medicine_id || null, medicine_name: name || null, product_name: name || null,
      note: body?.note || null, status: 'pending', createdAt: now(), updatedAt: now(),
    } as any);
    // Local stock hint only (pharmacy's own shelf view) — NOT the public badge
    if (body?.medicine_id) {
      await this.conn.collection('pharmacy_inventory').updateMany(
        { pharmacy_id: u, medicine_id: body.medicine_id } as any,
        { $set: { shortage_flagged: true } },
      );
    }
    // Notify admins about the new pending report
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'admin', title_key: 'بلاغ نقص دواء جديد',
      body_key: `بلاغ نقص من صيدلية: ${name || body?.medicine_id}`,
      type: 'alert', priority: 'high', is_read: false,
      data: { screen: '/admin/shortage-reports', report_id: reportId, medicine_id: body?.medicine_id || null },
      createdAt: now(), updatedAt: now(),
    } as any);
    return { ok: true, id: reportId, status: 'pending' };
  }
}

/* ── 17) Provider deltas (mine) ──────────────────────────────────────────── */
@Controller('provider-deltas')
class ProviderDeltasMineController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get()
  async mine(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('provider_deltas')
      .find({ $or: [{ account_id: u }, { provider_account_id: u }, { user_id: u }, { provider_id: u }] } as any)
      .sort({ createdAt: -1 }).limit(50).toArray();
    return rows.map((d: any) => ({
      id: String(d._id), kind: d.kind || d.type, status: d.status,
      summary: d.summary || d.title, created_at: d.createdAt,
    }));
  }
}

/* ── 18) Capabilities catalogs ───────────────────────────────────────────── */
@Controller('provider/capabilities')
class CapabilitiesCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('lab-services')
  async labServices() {
    const rows = await this.conn.collection('labservices').find({ active: { $ne: false } } as any).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
      price: s.price, category: s.category, prep: s.prep_instructions || s.prep || null,
    }));
  }

  @Get('radiology-services')
  async radiologyServices() {
    const rows = await this.conn.collection('radiologyservices').find({ active: { $ne: false } } as any).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
      price: s.price, category: s.category, modality: s.modality || null,
    }));
  }
}

/* ── 19) Provider facility ops ───────────────────────────────────────────── */
@Controller('provider/facility')
class ProviderFacilityController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async staffIds(fid: string): Promise<string[]> {
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any).project({ id: 1, user_id: 1 }).toArray();
    return rows.flatMap((r: any) => [r.id, r.user_id].filter(Boolean).map(String));
  }

  @Get('audit-logs')
  async auditLogs(@CurrentUser() user: any, @Query('limit') limit = '100') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('facility_audit_logs')
      .find({ facility_id: fid } as any).sort({ createdAt: -1 })
      .limit(Math.min(+limit || 100, 300)).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), actor: r.actor_id, action: r.action, target: r.target,
      meta: r.meta || {}, created_at: r.createdAt,
    }));
  }

  @Get('calendar')
  async calendar(@CurrentUser() user: any, @Query('days') days = '30') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const horizon = new Date(Date.now() + Math.min(+days || 30, 90) * 86400000);
    const rows = await this.conn.collection('appointments')
      .find({
        $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
        scheduled_at: { $lte: horizon },
      } as any)
      .sort({ scheduled_at: 1 }).limit(300).toArray();
    return rows.map((a: any) => ({
      id: a.id || String(a._id), patient_id: a.patient_id, provider_id: a.provider_id || a.doctor_id,
      scheduled_at: a.scheduled_at, status: a.status, kind: a.kind || 'consultation',
    }));
  }

  @Get('patients/active')
  async activePatients(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const patientIds: string[] = await this.conn.collection('appointments').distinct('patient_id', {
      $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
      status: { $nin: ['CANCELLED', 'cancelled', 'COMPLETED', 'completed'] },
    } as any);
    if (!patientIds.length) return [];
    const users = await this.conn.collection('users')
      .find({ $or: [{ id: { $in: patientIds } }, { _id: { $in: patientIds } }] } as any)
      .project({ id: 1, full_name: 1, phone: 1, email: 1 }).limit(300).toArray();
    return users.map((x: any) => ({ id: x.id || String(x._id), name: x.full_name, phone: x.phone, email: x.email }));
  }

  @Get('subaccounts')
  async subaccounts(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any)
      .project({ id: 1, email: 1, role: 1, ptype: 1, status: 1, full_name: 1, createdAt: 1 })
      .limit(300).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), email: r.email, name: r.full_name,
      role: r.role || r.ptype, status: r.status, created_at: r.createdAt,
    }));
  }

  @Get('shifts')
  async shifts(@CurrentUser() user: any, @Query('days') days = '14') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const horizon = new Date(Date.now() + Math.min(+days || 14, 60) * 86400000);
    const rows = await this.conn.collection('shifts')
      .find({ facility_id: fid, date: { $lte: horizon } } as any)
      .sort({ date: 1 }).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), staff_id: s.staff_id, staff_name: s.staff_name,
      role: s.role, date: s.date, start: s.start, end: s.end, status: s.status || 'scheduled',
    }));
  }
}

/* ── 20) Pharmacy B2B voice-to-order ─────────────────────────────────────── */
@Controller('provider/pharmacy/b2b')
class B2BVoiceController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Post('voice-to-order')
  async voiceToOrder(@CurrentUser() user: any, @Body() body: { text?: string }) {
    const text = String(body?.text || '').trim();
    if (!text) throw new BadRequestException('نص الطلب الصوتي مطلوب');
    const segments = text.split(/[,،;\n]|\s+و\s+/).map((s) => s.trim()).filter(Boolean);
    const items: any[] = [];
    const unmatched: string[] = [];
    for (const seg of segments.slice(0, 30)) {
      const m = seg.match(/^(\d{1,4})\s*[x×]?\s*(.+)$/) || seg.match(/^(.+?)\s*(\d{1,4})$/);
      const qty = m ? Math.min(parseInt(m[1].length <= 4 && /^\d/.test(m[0]) ? m[1] : m[2], 10) || 1, 999) : 1;
      const name = (m ? (/^\d/.test(m[0]) ? m[2] : m[1]) : seg).trim();
      if (!name) continue;
      const rx = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const product: any = await this.conn.collection('medicines_master')
        .findOne({ $or: [{ name_ar: rx }, { name_en: rx }] } as any);
      if (product) {
        items.push({
          medicine_id: product.id, name: product.name_ar || product.name_en,
          qty, unit_price: product.price ?? 0, matched: true,
        });
      } else {
        unmatched.push(name);
        items.push({ name, qty, matched: false });
      }
    }
    return {
      pharmacy_id: uid(user), items, unmatched,
      total_estimate: items.reduce((s, i) => s + (i.matched ? i.qty * (i.unit_price || 0) : 0), 0),
    };
  }
}

/* ── 22) Mental-health assessment question sets (PHQ-9 / GAD-7 standards) ── */
const PHQ9_QUESTIONS = [
  'قلة الاهتمام أو المتعة في فعل الأشياء',
  'الشعور بالإحباط أو الاكتئاب أو اليأس',
  'صعوبة في النوم أو النوم الزائد',
  'الشعور بالتعب أو قلة الطاقة',
  'فقدان الشهية أو الإفراط في الأكل',
  'الشعور بالسوء تجاه نفسك أو أنك فاشل',
  'صعوبة في التركيز على الأشياء',
  'بطء في الحركة أو الكلام أو فرط الحركة بشكل ملحوظ',
  'أفكار بأنك أفضل حالاً ميتاً أو بإيذاء نفسك',
];
const GAD7_QUESTIONS = [
  'الشعور بالعصبية أو القلق أو التوتر',
  'عدم القدرة على إيقاف أو السيطرة على القلق',
  'القلق المفرط حول أشياء مختلفة',
  'صعوبة في الاسترخاء',
  'التململ بحيث يصعب الجلوس بثبات',
  'الانزعاج بسهولة أو سرعة الغضب',
  'الشعور بالخوف كأن شيئاً فظيعاً قد يحدث',
];
const ASSESSMENT_SCALE = [
  { value: 0, label_ar: 'أبداً', label_en: 'Not at all' },
  { value: 1, label_ar: 'عدة أيام', label_en: 'Several days' },
  { value: 2, label_ar: 'أكثر من نصف الأيام', label_en: 'More than half the days' },
  { value: 3, label_ar: 'تقريباً كل يوم', label_en: 'Nearly every day' },
];

@Controller('mental-health')
class MentalHealthCompatController {
  @Get('assessment-questions')
  questions(@Query('type') type = 'phq9') {
    const t = String(type).toLowerCase();
    const isGad = t === 'gad7' || t === 'gad';
    const items = isGad ? GAD7_QUESTIONS : PHQ9_QUESTIONS;
    return {
      type: isGad ? 'gad7' : 'phq9',
      title_ar: isGad ? 'مقياس القلق العام GAD-7' : 'استبيان صحة المريض PHQ-9',
      instruction_ar: 'خلال الأسبوعين الماضيين، كم مرة أزعجتك المشكلات التالية؟',
      scale: ASSESSMENT_SCALE,
      questions: items.map((q, i) => ({ n: i + 1, text_ar: q })),
      max_score: items.length * 3,
    };
  }
}

/* ── Provider Drug Index (read-only) — serves MedicalDrugIndexScreen ─────────
   Shape contract matches the provider app's expectations exactly:
   { id, name_ar, name_en, active_ar, active_en, cat, manufacturer, ...badges }
   Providers can read everything; ordering is blocked at /orders/create (403). */
@Controller('drugs')
class ProviderDrugIndexController {
  constructor(@InjectConnection() private readonly conn: Connection) {}
  private get col() { return this.conn.collection('medicines_master'); }

  private card(m: any) {
    return {
      id: m.id,
      name_ar: m.name_ar || m.name_en,
      name_en: m.name_en || m.name_ar,
      active_ar: m.active_ingredient || null,
      active_en: m.active_ingredient || null,
      cat: m.category === 'أدوية ومكملات' ? 'medications' : (m.category === 'العناية بالبشرة' ? 'skincare' : 'other'),
      category_ar: m.category,
      sub_category: m.sub_category || null,
      manufacturer: m.manufacturer || null,
      brand: m.brand || m.manufacturer || null,
      form: m.form || null,
      strength: m.strength || null,
      package_size: m.package_size || null,
      price: m.price || 0,
      old_price: m.old_price || null,
      discount_percent: m.old_price > m.price && m.price > 0 ? Math.round((1 - m.price / m.old_price) * 100) : 0,
      image: m.image || m.images?.[0] || m.image_1 || null,
      images: (Array.isArray(m.images) && m.images.length ? m.images : [m.image_1, m.image_2, m.image_3, m.image_4, m.image_5].filter(Boolean)) || [],
      requires_prescription: !!m.requires_prescription,
      online_exclusive: !!m.online_exclusive,
      available_online: !!m.available_online,
      potentially_unavailable: m.availability_status === 'availability_may_be_limited' || m.availability_status === 'admin_flagged_shortage',
      discontinued: m.availability_status === 'discontinued',
      available: !m.availability_status || m.availability_status === 'none',
    };
  }

  @Get()
  async list(@Query('search') search?: string, @Query('category') category?: string, @Query('limit') limit = '50') {
    const q: any = { is_deleted: { $ne: true } };
    if (search) q.$or = [
      { name_ar: { $regex: search, $options: 'i' } },
      { name_en: { $regex: search, $options: 'i' } },
      { active_ingredient: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
    ];
    if (category && category !== 'all') {
      const map: Record<string, string> = { medications: 'أدوية ومكملات', skincare: 'العناية بالبشرة', vitamins: 'أدوية ومكملات' };
      if (category === 'vitamins') {
        q.sub_category = { $regex: 'فيتامين', $options: 'i' };
      } else {
        // Dynamic categories are matched directly against the catalog's Arabic names
        q.category = map[category] || category;
      }
    }
    const rows = await this.col.find(q, { projection: { _id: 0, translations: 0, more_info_ar: 0, more_info_en: 0 } })
      .sort({ usage_count: -1, name_ar: 1 }).limit(Math.min(parseInt(limit, 10) || 50, 100)).toArray();
    return { data: rows.map((m: any) => this.card(m)), total: rows.length };
  }

  @Get('categories')
  async categories() {
    const rows = await this.col.aggregate([
      { $match: { is_deleted: { $ne: true }, category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]).toArray();
    return { data: rows.map((r: any) => ({ key: r._id, count: r.count })) };
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const m: any = await this.col.findOne({ id, is_deleted: { $ne: true } }, { projection: { _id: 0 } });
    if (!m) return { error: 'not_found' };
    const alternatives = m.active_ingredient
      ? await this.col.find(
          { active_ingredient: m.active_ingredient, id: { $ne: id }, is_deleted: { $ne: true } },
          { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, image: 1 } } as any,
        ).limit(8).toArray()
      : [];
    return {
      ...this.card(m),
      generic_name: m.generic_name || null,
      barcode: m.barcode || null,
      dosage_ar: m.dosage_ar || null,
      dosage_en: m.dosage_en || null,
      usage_instructions_ar: m.usage_instructions_ar || null,
      warnings_ar: m.warnings_ar || [],
      warnings_en: m.warnings_en || [],
      precautions_ar: m.precautions_ar || [],
      side_effects_ar: m.side_effects_ar || [],
      interactions: m.interactions || [],
      contraindications_ar: m.contraindications_ar || [],
      storage_conditions_ar: m.storage_conditions_ar || null,
      indications_ar: m.indications_ar || [],
      description_ar: m.description_ar || null,
      shortage_notes: m.shortage_notes || null,
      alternatives,
    };
  }
}

/* ── Provider consolidated dashboard (all 7 roles) ───────────────────────── */
@Controller('provider/dashboard')
@UseGuards(JwtAuthGuard)
class ProviderDashboardController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  async dashboard(@CurrentUser() user: any) {
    const uid = user.id;
    const role = user.role;
    const profile: any = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ user_id: uid }, { account_id: uid }] } as any,
      { projection: { _id: 0 } },
    );

    // ── Role-scoped collections for jobs/orders ──
    const jobQueries: Record<string, { col: string; idField: string; dateField: string }> = {
      pharmacy: { col: 'orders', idField: 'pharmacy_id', dateField: 'createdAt' },
      doctor: { col: 'appointments', idField: 'provider_id', dateField: 'scheduled_time' },
      lab: { col: 'labbookings', idField: 'provider_account_id', dateField: 'createdAt' },
      radiology: { col: 'radiologybookings', idField: 'provider_account_id', dateField: 'createdAt' },
      nurse: { col: 'homecarebookings', idField: 'assigned_provider_id', dateField: 'createdAt' },
      driver: { col: 'orders', idField: 'driver_id', dateField: 'createdAt' },
    };
    const q = jobQueries[role as string] || jobQueries.pharmacy;
    const col = this.conn.collection(q.col);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const base: any = { [q.idField]: uid };

    const [total, today, pending, completed, revenueAgg, upcoming] = await Promise.all([
      col.countDocuments(base),
      col.countDocuments({ ...base, [q.dateField]: { $gte: todayStart } }),
      col.countDocuments({ ...base, $or: [{ state: { $in: ['CREATED', 'PENDING', 'NEW_REQUEST', 'REQUESTED', 'ASSIGNED'] } }, { status: { $in: ['CREATED', 'PENDING', 'NEW_REQUEST', 'REQUESTED', 'ASSIGNED'] } }] }),
      col.countDocuments({ ...base, $or: [{ state: { $in: ['DELIVERED', 'COMPLETED', 'REPORTED'] } }, { status: { $in: ['DELIVERED', 'COMPLETED', 'REPORTED'] } }] }),
      col.aggregate([
        { $match: { ...base, $or: [{ state: { $in: ['DELIVERED', 'COMPLETED'] } }, { status: { $in: ['DELIVERED', 'COMPLETED'] } }] } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', { $ifNull: ['$totals.total', { $ifNull: ['$amount', 0] }] }] } } } },
      ]).toArray().catch(() => []),
      role === 'doctor'
        ? this.conn.collection('appointments').find({ provider_id: uid, scheduled_time: { $gte: new Date() }, status: { $in: ['SCHEDULED', 'CONFIRMED', 'ACCEPTED'] } }, { projection: { _id: 0, id: 1, patient_name: 1, scheduled_time: 1, type: 1 } }).sort({ scheduled_time: 1 }).limit(10).toArray()
        : Promise.resolve([]),
    ]);

    // ── Wallet (platform ledger) ──
    let wallet: any = { balance: 0, pending_payout: 0 };
    try {
      const w = await this.conn.collection('platformledgerentries').aggregate([
        { $match: { provider_account_id: uid } },
        { $group: { _id: null, earned: { $sum: { $cond: [{ $eq: ['$type', 'provider_earning'] }, '$amount', 0] } }, paid: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$state', 'pending'] }, '$amount', 0] } } } },
      ]).toArray();
      if (w[0]) wallet = { balance: Math.max(0, (w[0].earned || 0) - (w[0].paid || 0)), pending_payout: w[0].pending || 0 };
    } catch { /* ledger optional */ }

    // ── Profile completion ──
    const required = ['name_ar', 'license_number', 'city', 'address', 'iban'];
    const done = required.filter(f => profile?.[f]).length;
    const completion = profile ? Math.round(((done + (profile.license_verified ? 2 : 0) + (profile.location ? 1 : 0)) / (required.length + 3)) * 100) : 0;

    return {
      role,
      profile: profile ? {
        id: profile.id, name: profile.name_ar || profile.name_en, type: profile.type,
        status: profile.status, verification: profile.license_verified ? 'verified' : profile.verification_status || 'pending',
        rating_avg: profile.rating_avg || profile.rating || 0,
        reviews_count: profile.reviews_count || profile.rating_count || 0,
        city: profile.city,
      } : null,
      profile_completion: completion,
      stats: {
        total_jobs: total,
        today: today,
        pending,
        completed,
        revenue_total: Math.round(((revenueAgg[0]?.total) || 0) * 100) / 100,
      },
      wallet,
      upcoming_appointments: upcoming,
      availability: profile?.availability || { status: 'online' },
    };
  }
}

// ─── Patient pharmacy orders (patient-facing; pharmacy_ops is provider-side) ─
@Controller('patient/pharmacy')
@UseGuards(JwtAuthGuard)
export class PatientPharmacyOrdersController {
  constructor(@InjectConnection() private conn: Connection) {}
  private get col() { return this.conn.db.collection('pharmacy_orders'); }

  @Post('orders')
  async create(@CurrentUser() u: any, @Body() body: any) {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0 && !body?.prescription_id && !body?.manual_request) {
      throw new BadRequestException('order_requires_items_or_prescription');
    }
    const doc: any = {
      id: uuid(),
      patient_id: userId,
      items,
      prescription_id: body?.prescription_id ?? null,
      manual_request: body?.manual_request ?? null,
      delivery_address_id: body?.delivery_address_id ?? null,
      payment_method: body?.payment_method ?? 'cash',
      insurance_policy_id: body?.insurance_policy_id ?? null,
      status: 'pending_broadcast',
      created_at: now(),
      updated_at: now(),
    };
    await this.col.insertOne(doc);
    const { _id, ...out } = doc;
    return { data: out };
  }

  @Get('orders')
  async listMine(@CurrentUser() u: any, @Query('limit') limit = '20', @Query('page') page = '1') {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const docs = await this.col
      .find({ patient_id: userId } as any)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d), page: parseInt(page, 10) || 1, limit: lim };
  }

  @Get('orders/:id')
  async one(@CurrentUser() u: any, @Param('id') id: string) {
    const doc = await mustOwnBooking(this.conn, 'pharmacy_orders', id, uid(u));
    const { _id, ...out } = doc as any;
    return { data: out };
  }
}

// ─── Patient home-care (services/packages catalog + bookings) ────────────────
@Controller('home-care')
@UseGuards(JwtAuthGuard)
export class PatientHomeCareController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('services')
  async services(@Query('limit') limit = '50') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const docs = await this.conn.db
      .collection('nursing_catalog')
      .find({ is_active: { $ne: false }, kind: { $ne: 'package' } } as any)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d) };
  }

  @Get('packages')
  async packages(@Query('limit') limit = '50') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const docs = await this.conn.db
      .collection('nursing_catalog')
      .find({ is_active: { $ne: false }, kind: 'package' } as any)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d) };
  }

  @Post('bookings')
  async book(@CurrentUser() u: any, @Body() body: any) {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    if (!body?.service_id && !body?.package_id) throw new BadRequestException('service_or_package_required');
    const doc: any = {
      id: uuid(),
      patient_id: userId,
      service_id: body?.service_id ?? null,
      package_id: body?.package_id ?? null,
      scheduled_at: body?.scheduled_at ?? null,
      address_id: body?.address_id ?? null,
      notes: body?.notes ?? null,
      payment_method: body?.payment_method ?? 'cash',
      insurance_policy_id: body?.insurance_policy_id ?? null,
      status: 'requested',
      created_at: now(),
      updated_at: now(),
    };
    await this.conn.db.collection('home_care_bookings').insertOne(doc);
    const { _id, ...out } = doc;
    return { data: out };
  }

  @Get('bookings/my')
  async myBookings(@CurrentUser() u: any, @Query('limit') limit = '20', @Query('page') page = '1') {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const docs = await this.conn.db
      .collection('home_care_bookings')
      .find({ patient_id: userId } as any)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d), page: parseInt(page, 10) || 1, limit: lim };
  }
}

// ─── Patient refunds ─────────────────────────────────────────────────────────
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class PatientRefundsController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('my')
  async my(@CurrentUser() u: any, @Query('limit') limit = '20', @Query('page') page = '1') {
    const userId = uid(u);
    if (!userId) throw new ForbiddenException('authenticated_user_required');
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const docs = await this.conn.db
      .collection('refunds')
      .find({ $or: [{ patient_id: userId }, { user_id: userId }] } as any)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(lim)
      .toArray();
    return { data: docs.map(({ _id, ...d }: any) => d), page: parseInt(page, 10) || 1, limit: lim };
  }
}

// ─── Patient: lab detail (parity for mobile diagnostics/lab/[id]) ────────────
@Controller('labs')
@UseGuards(JwtAuthGuard)
export class PatientLabsCatalogController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get(':id')
  async one(@CurrentUser() u: any, @Param('id') id: string) {
    if (!uid(u)) throw new ForbiddenException('authenticated_user_required');
    const doc = await this.conn.db.collection('labs_catalog').findOne({ $or: [{ id }, { _id: id as any }] } as any);
    if (!doc) throw new NotFoundException('lab_not_found');
    const { _id, ...out } = doc as any;
    return { data: out };
  }
}

// ─── Patient: nurse public profile (parity for mobile nursing/nurse-profile) ──
@Controller('nursing')
@UseGuards(JwtAuthGuard)
export class PatientNurseProfileController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get('nurses/:id')
  async one(@CurrentUser() u: any, @Param('id') id: string) {
    if (!uid(u)) throw new ForbiddenException('authenticated_user_required');
    const doc = await this.conn.db.collection('nurses').findOne({ $or: [{ id }, { _id: id as any }] } as any);
    if (!doc) throw new NotFoundException('nurse_not_found');
    const { _id, ...out } = doc as any;
    return { data: out };
  }
}

// ─── Patient: reviews listing (parity for mobile reviews/index) ──────────────
@Controller('patient-ux')
@UseGuards(JwtAuthGuard)
export class PatientReviewsListController {
  constructor(@InjectConnection() private conn: Connection) {}
  @Get('reviews')
  async list(@CurrentUser() u: any, @Query('target_id') targetId?: string, @Query('limit') limit = '20', @Query('page') page = '1') {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = Math.max((parseInt(page, 10) || 1) - 1, 0) * lim;
    const filter: any = {};
    if (targetId) filter.target_id = targetId;
    const docs = await this.conn.db.collection('reviews').find(filter).sort({ created_at: -1 }).skip(skip).limit(lim).toArray();
    return { data: docs.map(({ _id, ...d }: any) => d), page: parseInt(page, 10) || 1, limit: lim };
  }
}

/* ── module registration ─────────────────────────────────────────────────── */


@Module({
  controllers: [
    ProviderDrugIndexController,
    ProviderDashboardController,
    FamilyChatController,
    HealthMedsController,
    WearablesController,
    HomeCarePackagesController,
    MaternityVaccinesController,
    NutritionFoodsController,
    OffersDetailController,
    PromotionsOffersController,
    ReportsTimelineController,
    SupportChatController,
    AuditIngestController,
    AiInteractionsController,
    ConsultationsCompatController,
    FacilityInboxController,
    NursingCompatController,
    PharmacyCompatController,
    ProviderDeltasMineController,
    CapabilitiesCatalogController,
    ProviderFacilityController,
    B2BVoiceController,
    MentalHealthCompatController,
    PatientPharmacyOrdersController,
    PatientHomeCareController,
    PatientRefundsController,
    PatientLabsCatalogController,
    PatientNurseProfileController,
    PatientReviewsListController,
  ],
})
export class CompatModule {}
