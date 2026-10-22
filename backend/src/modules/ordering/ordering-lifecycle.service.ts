import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { recordAudit } from '../../common/audit-record';
import { LabsService } from '../labs/labs.service';
import { PatientUxService } from '../patient-ux/patient-ux.module';
import { PaymentsService } from '../payments/payments.module';
import { ArriveDto, ResultsDto, StaffDto } from './ordering.dto';
import { rank, mergeWeights, reliabilityRates, round2 } from './ordering-engine';
import { KIND_CATALOG, LIFECYCLE, OrderingService } from './ordering.service';

// M7: after the booking and the safeguards. The provider confirms in time (else auto-cancel, refund started, next best offered),
// the visit (staff, 4-digit arrival code that locks after 3 wrong tries), preparation reminders, results with trends,
// the provider's reliability and the emergency button. All booking reads are scoped to the patient or the booking's provider.

const BOOKINGS = 'labbookings'; // the Mongoose default collection of the LabBooking model
const RESULTS = 'ordering_results';
const STAFF = 'provider_staff';
const MAX_WRONG_CODES = 3;
const ARRIVAL_GRACE_MS = 2 * 3_600_000;
const OFFSET_MS = 3 * 3_600_000; // Riyadh, no daylight saving
const FASTING_WORDS = /fast|صيام|صائم|روزہ|उपवास|রোজা|উপবাস|aayuno|puasa/i;

interface Lifecycle {
  booking_id: string; patient_id: string; provider_account_id: string; quote_id: string; confirm_deadline_at: Date | null;
  confirmed_at: Date | null; cancelled_at?: Date; alternative?: { provider_id: string; total: number; earliest_at: string } | null;
  staff_id?: string; arrival_code?: string; wrong_codes?: number; arrived_at?: Date;
}

@Injectable()
export class OrderingLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(OrderingLifecycleService.name);
  private ticking = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ordering: OrderingService,
    private readonly labs: LabsService,
    private readonly payments: PaymentsService,
    private readonly patientUx: PatientUxService,
  ) {}

  private lc() { return this.conn.collection<any>(LIFECYCLE); }
  private bookings() { return this.conn.collection<any>(BOOKINGS); }

  async onModuleInit() {
    await this.conn.collection(RESULTS).createIndex({ booking_id: 1 }, { unique: true, name: 'result_booking_unique' });
    await this.conn.collection(RESULTS).createIndex({ patient_id: 1, 'values.catalog_id': 1, created_at: 1 }, { name: 'result_trend' });
    await this.conn.collection(STAFF).createIndex({ id: 1 }, { unique: true, name: 'staff_id_unique' });
    await this.conn.collection(STAFF).createIndex({ provider_account_id: 1 }, { name: 'staff_provider' });
    await this.conn.collection('consultation_drafts').createIndex({ patient_id: 1, created_at: -1 }, { name: 'draft_patient' });
  }

  @Interval(5_000)
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.expireDue();
    } catch (e) {
      this.logger.warn(`lifecycle tick failed: ${(e as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  // ---------- loading with ownership ----------

  /** The booking and its lifecycle for the patient who owns it (404 for anyone else). */
  private async ownedByPatient(patientId: string, id: string) {
    const b = await this.bookings().findOne({ id, patient_id: patientId, order_group_id: { $exists: true } });
    if (!b) throw new NotFoundException('booking_not_found');
    const lc = await this.lifecycleOf(b);
    await this.expireOne(lc);
    return { b: (await this.bookings().findOne({ id })) ?? b, lc: (await this.lc().findOne({ booking_id: id })) as unknown as Lifecycle };
  }

  /** The booking and its lifecycle for the provider the booking belongs to (404 unknown, 403 another provider). */
  private async ownedByProvider(providerId: string, id: string) {
    const b = await this.bookings().findOne({ id, order_group_id: { $exists: true } });
    if (!b) throw new NotFoundException('booking_not_found');
    if (b.provider_account_id !== providerId) throw new ForbiddenException('not_your_booking');
    const lc = await this.lifecycleOf(b);
    await this.expireOne(lc);
    return { b: (await this.bookings().findOne({ id })) ?? b, lc: (await this.lc().findOne({ booking_id: id })) as unknown as Lifecycle };
  }

  /** Bookings made by a broadcast (M4) were accepted by their provider already: no deadline, confirmed. */
  private async lifecycleOf(b: any): Promise<Lifecycle> {
    const existing = (await this.lc().findOne({ booking_id: b.id })) as unknown as Lifecycle | null;
    if (existing) return existing;
    await this.ordering.registerLifecycle(b.id, b.patient_id, b.provider_account_id, b.price_lock?.quote_id ?? b.order_group_id, null, true);
    return (await this.lc().findOne({ booking_id: b.id })) as unknown as Lifecycle;
  }

  // ---------- confirm deadline ----------

  async confirm(provider: { id: string }, id: string) {
    const { lc } = await this.ownedByProvider(provider.id, id);
    if (lc.cancelled_at) throw new ConflictException('confirm_deadline_passed');
    if (lc.confirmed_at) return { confirmed: true };
    const won = await this.lc().findOneAndUpdate(
      { booking_id: id, confirmed_at: null, cancelled_at: { $exists: false }, $or: [{ confirm_deadline_at: null }, { confirm_deadline_at: { $gt: new Date() } }] },
      { $set: { confirmed_at: new Date() } },
    );
    if (!won) throw new ConflictException('confirm_deadline_passed');
    await this.bookings().updateOne({ id, status: 'pending' }, { $set: { status: 'confirmed' } });
    await this.ordering.bump(provider.id, 'accepted');
    return { confirmed: true };
  }

  async expireDue() {
    const due = (await this.lc().find({ confirmed_at: null, cancelled_at: { $exists: false }, confirm_deadline_at: { $lte: new Date() } }).limit(50).toArray()) as unknown as Lifecycle[];
    for (const lc of due) await this.expireOne(lc).catch((e) => this.logger.warn(`expire ${lc.booking_id}: ${(e as Error).message}`));
  }

  /** The first caller flips the lifecycle to cancelled; only that caller cancels the booking and starts the refund. */
  private async expireOne(lc: Lifecycle) {
    if (lc.confirmed_at || lc.cancelled_at || !lc.confirm_deadline_at || new Date(lc.confirm_deadline_at).getTime() > Date.now()) return;
    const won = await this.lc().findOneAndUpdate({ booking_id: lc.booking_id, confirmed_at: null, cancelled_at: { $exists: false } }, { $set: { cancelled_at: new Date() } });
    if (!won) return;
    const b = await this.bookings().findOne({ id: lc.booking_id });
    if (!b) return;
    if (!(await this.labs.cancelUnconfirmed(lc.booking_id))) return;
    await this.ordering.bump(lc.provider_account_id, 'cancellations');
    await this.startRefund(b);
    const alternative = await this.alternativeFor(b, lc).catch(() => null);
    await this.lc().updateOne({ booking_id: lc.booking_id }, { $set: { alternative } });
    await recordAudit(this.conn, { action: 'ordering.confirm_deadline_cancelled', user_id: 'system', role: 'system', resource_kind: 'lab_booking', resource_id: lc.booking_id, details: { refund: 'initiated' } });
  }

  /** Money paid by card goes back through the gateway; anything the gateway cannot do becomes a refund request for the admin. `initiated` is always recorded. */
  private async startRefund(b: any) {
    const paid = ['paid', 'partially_refunded'].includes(b.payment_status);
    if (paid && b.transaction_id) {
      try {
        await this.payments.refundTransactionAsSystem(b.transaction_id, undefined, 'confirm_deadline_passed');
      } catch (e) {
        this.logger.warn(`automatic refund of ${b.id} failed (${(e as Error).message}); a refund request is filed`);
        await this.patientUx.requestRefund({ id: b.patient_id }, { booking_kind: 'lab', booking_id: b.id, reason: 'confirm_deadline_passed', amount: b.total_price }).catch(() => null);
      }
    }
    await this.bookings().updateOne({ id: b.id }, { $set: { refund_status: 'initiated', refund_amount: paid ? b.total_price : 0 } });
  }

  /** The next best candidate for the same items and place, without the provider that did not confirm. */
  private async alternativeFor(b: any, lc: Lifecycle) {
    const quote: any = await this.conn.collection('ordering_quotes').findOne({ id: lc.quote_id, patient_id: b.patient_id });
    const kind = quote?.service_kind ?? 'lab';
    const ids: string[] = (b.price_lock?.items ?? []).map((i: any) => i.catalog_id);
    const mode = b.location_type === 'home' ? 'home' : 'facility';
    const ctx = { lat: quote?.context?.lat ?? b.address?.lat, lng: quote?.context?.lng ?? b.address?.lng, payer: 'cash' as const };
    if (typeof ctx.lat !== 'number' || typeof ctx.lng !== 'number' || !ids.length) return null;
    const found = await this.ordering.findCandidates(kind, mode, ids, ctx, null, new Date());
    const full = found.cands.filter((c) => found.snapshot[c.provider_id].account_id !== lc.provider_account_id && ids.every((id) => c.prices[id] != null));
    const weights = mergeWeights((await this.conn.collection('system_configs').findOne({ key: 'ordering_ranking_weights' }))?.value);
    const best = rank(full, ids, mode, 'cash', weights)[0];
    return best ? { provider_id: best.c.provider_id, total: best.total, earliest_at: best.c.earliest_at.toISOString() } : null;
  }

  // ---------- the booking as the patient sees it ----------

  async view(user: { id: string }, id: string) {
    const { b, lc } = await this.ownedByPatient(user.id, id);
    return {
      id: b.id, status: b.status ?? 'pending', state: b.state, mode: b.location_type, total: b.total_price ?? b.total, price_locked_at: b.price_locked_at ?? null,
      items: (b.price_lock?.items ?? []).map((i: any) => ({ catalog_id: i.catalog_id, price: i.price })),
      confirm_deadline_at: lc.confirmed_at ? null : lc.confirm_deadline_at,
      payment: { amount: b.total_price ?? b.total, status: b.payment_status ?? 'pending', refund_status: b.refund_status ?? null },
      alternative: lc.alternative ?? null,
    };
  }

  // ---------- the visit ----------

  async visit(user: { id: string }, id: string) {
    const { b, lc } = await this.ownedByPatient(user.id, id);
    const [profile, staff] = await Promise.all([
      this.conn.collection('provider_profiles').findOne({ account_id: b.provider_account_id }, { projection: { id: 1, name_ar: 1, name_en: 1, medical_license_number: 1, photo_url: 1, logo_url: 1 } }) as Promise<any>,
      lc.staff_id ? this.conn.collection(STAFF).findOne({ id: lc.staff_id, provider_account_id: b.provider_account_id }) as Promise<any> : Promise.resolve(null),
    ]);
    return {
      status: b.status ?? 'pending',
      provider: { id: profile?.id ?? null, name_ar: profile?.name_ar ?? null, name_en: profile?.name_en ?? null, license: profile?.medical_license_number ?? null, photo_url: profile?.photo_url ?? profile?.logo_url ?? null },
      ...(staff ? { staff: { id: staff.id, name: staff.name, license: staff.license_number, photo_url: staff.photo_url ?? null, gender: staff.gender } } : {}),
      ...(staff && lc.arrival_code && !lc.arrived_at ? { arrival_code: lc.arrival_code } : {}),
    };
  }

  async assign(provider: { id: string }, id: string, staffId: string) {
    const { b, lc } = await this.ownedByProvider(provider.id, id);
    if (lc.cancelled_at || ['CANCELLED', 'REPORTED'].includes(b.state)) throw new ConflictException('booking_closed');
    const staff: any = await this.conn.collection(STAFF).findOne({ id: staffId, provider_account_id: provider.id, active: { $ne: false } });
    if (!staff) throw new NotFoundException('staff_not_found');
    if (b.gender_preference && staff.gender !== b.gender_preference) throw new BadRequestException('staff_gender_mismatch');
    const code = String(randomInt(0, 10_000)).padStart(4, '0'); // Western digits, always 4
    const set: Record<string, unknown> = { staff_id: staffId };
    if (!lc.arrival_code) { set.arrival_code = code; set.wrong_codes = 0; }
    if (!lc.confirmed_at) set.confirmed_at = new Date(); // assigning someone is accepting the visit
    await this.lc().updateOne({ booking_id: id }, { $set: set });
    if (!lc.confirmed_at) await this.ordering.bump(provider.id, 'accepted');
    await this.bookings().updateOne({ id }, { $set: { status: 'assigned' } });
    return { assigned: true };
  }

  async arrive(provider: { id: string }, id: string, dto: ArriveDto) {
    const { b, lc } = await this.ownedByProvider(provider.id, id);
    if (!lc.arrival_code) throw new ConflictException('no_staff_assigned');
    if ((lc.wrong_codes ?? 0) >= MAX_WRONG_CODES) throw new HttpException('arrival_code_locked', 423);
    if (!/^[0-9]{4}$/.test(dto.code)) throw new BadRequestException('arrival_code_invalid');
    const same = dto.code.length === lc.arrival_code.length && timingSafeEqual(Buffer.from(dto.code), Buffer.from(lc.arrival_code));
    if (!same) {
      // the counter moves atomically, so parallel guesses cannot exceed the limit
      const after = await this.lc().findOneAndUpdate({ booking_id: id, wrong_codes: { $lt: MAX_WRONG_CODES } }, { $inc: { wrong_codes: 1 } }, { returnDocument: 'after' });
      if (!after || (after.wrong_codes ?? 0) >= MAX_WRONG_CODES) throw new HttpException('arrival_code_locked', 423);
      throw new BadRequestException('arrival_code_invalid');
    }
    const now = new Date();
    await this.lc().updateOne({ booking_id: id, arrived_at: { $exists: false } }, { $set: { arrived_at: now } });
    await this.bookings().updateOne({ id }, { $set: { status: 'in_service' } });
    const start = new Date(b.scheduled_start ?? b.scheduled_at ?? now).getTime();
    if (now.getTime() <= start + ARRIVAL_GRACE_MS) await this.ordering.bump(provider.id, 'on_time');
    return { status: 'in_service' };
  }

  // ---------- staff of the provider ----------

  async listStaff(provider: { id: string }) {
    const rows = await this.conn.collection(STAFF).find({ provider_account_id: provider.id }).project({ _id: 0, id: 1, name: 1, gender: 1, license_number: 1, photo_url: 1, active: 1 }).limit(200).toArray();
    return { staff: rows };
  }

  async putStaff(provider: { id: string }, dto: StaffDto) {
    const id = dto.id ?? `st_${randomUUID()}`;
    try {
      await this.conn.collection(STAFF).updateOne(
        { id, provider_account_id: provider.id },
        { $set: { name: dto.name.trim(), gender: dto.gender, license_number: dto.license_number.trim(), photo_url: dto.photo_url ?? null, active: dto.active !== false, updated_at: new Date() }, $setOnInsert: { id, provider_account_id: provider.id, created_at: new Date() } },
        { upsert: true },
      );
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ConflictException('staff_id_taken'); // the id belongs to another provider
      throw e;
    }
    return { id };
  }

  // ---------- preparation reminders ----------

  async reminders(user: { id: string }, id: string) {
    const { b } = await this.ownedByPatient(user.id, id);
    const visit = new Date(b.scheduled_start ?? b.scheduled_at ?? 0).getTime();
    if (!visit) return { reminders: [] };
    const ids: string[] = (b.price_lock?.items ?? []).map((i: any) => i.catalog_id);
    const quote: any = await this.conn.collection('ordering_quotes').findOne({ id: b.price_lock?.quote_id, patient_id: user.id }, { projection: { service_kind: 1 } });
    const kind = quote?.service_kind ?? 'lab';
    const [rows, catalog] = await Promise.all([
      this.conn.collection('provider_ordering_items').find({ provider_account_id: b.provider_account_id, service_kind: kind, catalog_id: { $in: ids } }).toArray() as Promise<any[]>,
      this.conn.collection(KIND_CATALOG[kind as 'lab']).find({ id: { $in: ids } }).toArray() as Promise<any[]>,
    ]);
    const fasting = ids.some((cid) => {
      const prep = rows.find((r) => r.catalog_id === cid)?.preparation;
      const cat = catalog.find((c) => c.id === cid);
      return Number(prep?.fasting_hours) > 0 || cat?.fasting_required === true || Object.values(prep ?? {}).some((t) => typeof t === 'string' && FASTING_WORDS.test(t));
    });
    const hasPrep = rows.some((r) => r.preparation && Object.values(r.preparation).some((t) => typeof t === 'string' && t.trim()));
    if (!fasting && !hasPrep) return { reminders: [] };
    const midnight = Math.floor((visit + OFFSET_MS) / 86_400_000) * 86_400_000 - OFFSET_MS; // the visit's local midnight
    const night = midnight - 4 * 3_600_000; // 20:00 the evening before
    const morning = Math.min(visit - 2 * 3_600_000, midnight + 7 * 3_600_000); // 2 h before, at most 07:00
    const list = fasting
      ? [{ kind: 'fasting_night', at: new Date(night) }, { kind: 'fasting_morning', at: new Date(morning) }]
      : [{ kind: 'preparation', at: new Date(night) }];
    return { reminders: list.filter((r) => r.at.getTime() > Date.now()).map((r) => ({ kind: r.kind, at: r.at.toISOString() })) };
  }

  // ---------- results ----------

  async postResults(provider: { id: string }, id: string, dto: ResultsDto) {
    const { b } = await this.ownedByProvider(provider.id, id);
    const allowed = new Set<string>((b.price_lock?.items ?? []).map((i: any) => i.catalog_id));
    const seen = new Set<string>();
    for (const v of dto.values) {
      if (!allowed.has(v.catalog_id)) throw new BadRequestException('unknown_booking_item');
      if (seen.has(v.catalog_id)) throw new BadRequestException('duplicate_result');
      if (v.range.low > v.range.high) throw new BadRequestException('range_invalid');
      seen.add(v.catalog_id);
    }
    const values = dto.values.map((v) => ({ catalog_id: v.catalog_id, value: v.value, unit: v.unit.trim(), range: { low: v.range.low, high: v.range.high }, flag: v.value < v.range.low ? 'low' : v.value > v.range.high ? 'high' : 'normal' }));
    const now = new Date();
    const res = await this.conn.collection(RESULTS).updateOne(
      { booking_id: id },
      { $set: { values, updated_at: now }, $setOnInsert: { id: `res_${randomUUID()}`, booking_id: id, patient_id: b.patient_id, provider_account_id: provider.id, created_at: now } },
      { upsert: true },
    );
    if (res.upsertedCount) await this.ordering.bump(provider.id, 'completed');
    await recordAudit(this.conn, { action: 'ordering.results_posted', user_id: provider.id, role: 'provider', resource_kind: 'lab_booking', resource_id: id, details: { values: values.length } });
    return { posted: values.length };
  }

  async results(user: { id: string }, id: string) {
    const { b } = await this.ownedByPatient(user.id, id);
    const doc: any = await this.conn.collection(RESULTS).findOne({ booking_id: id, patient_id: user.id });
    if (!doc) throw new NotFoundException('results_not_ready');
    const names = new Map<string, string>((b.items ?? []).map((i: any) => [i.service_id as string, (i.name_en || i.name_ar || i.service_id) as string]));
    const earlier = (await this.conn.collection(RESULTS).find({ patient_id: user.id, 'values.catalog_id': { $in: doc.values.map((v: any) => v.catalog_id) }, created_at: { $lte: doc.created_at } }).sort({ created_at: 1 }).limit(200).toArray()) as any[];
    return {
      values: doc.values.map((v: any) => ({
        ...v, name: names.get(v.catalog_id) ?? v.catalog_id,
        trend: earlier.flatMap((r) => r.values.filter((x: any) => x.catalog_id === v.catalog_id).map((x: any) => ({ date: r.created_at, value: x.value }))),
      })),
      discuss_with_doctor: { available: true },
    };
  }

  /** Opens the instant-consultation flow with the result attached: a draft only, nothing is broadcast yet. */
  async discuss(user: { id: string }, id: string) {
    await this.ownedByPatient(user.id, id);
    const doc: any = await this.conn.collection(RESULTS).findOne({ booking_id: id, patient_id: user.id }, { projection: { id: 1 } });
    if (!doc) throw new NotFoundException('results_not_ready');
    const draft = { id: `cd_${randomUUID()}`, patient_id: user.id, booking_id: id, attached_result_id: doc.id, kind: 'instant_consultation', created_at: new Date() };
    await this.conn.collection('consultation_drafts').insertOne(draft as never);
    return { consultation_draft: true, draft_id: draft.id, attached_result_id: doc.id };
  }

  // ---------- reliability ----------

  async reliability(provider: { id: string }) {
    const r = await this.conn.collection('provider_reliability').findOne({ provider_account_id: provider.id });
    return reliabilityRates(r as never);
  }

  // ---------- emergency ----------

  /** The patient's button calls the configured urgent-help number and tells support; it dispatches nothing (D-14). */
  async emergency(user: { id: string }, id: string) {
    const { b } = await this.ownedByPatient(user.id, id);
    if (['CANCELLED', 'REPORTED'].includes(b.state)) throw new ConflictException('booking_closed');
    const cfg = (await this.conn.collection('system_configs').findOne({ key: 'mental_health_urgent_help' }))?.value as { phone?: unknown } | undefined;
    const call = typeof cfg?.phone === 'string' && /^[0-9+]{2,15}$/.test(cfg.phone) ? cfg.phone : '997';
    const now = new Date();
    await this.conn.collection('admin_alerts').insertOne({
      id: `aa_${randomUUID()}`, kind: 'ordering_emergency', entity_type: 'lab_booking', entity_id: id, booking_id: id, window: now.toISOString(),
      dedupe_key: `ordering_emergency:lab_booking:${id}:${now.toISOString()}`, severity: 'high', message_key: 'admin_alerts.ordering_emergency',
      params: { booking_id: id }, link: `/admin/orders/lab/${encodeURIComponent(id)}`, created_at: now, read_by: [], notify_email: false, emailed_at: null,
    } as never);
    await recordAudit(this.conn, { action: 'ordering.emergency_pressed', user_id: user.id, role: 'patient', resource_kind: 'lab_booking', resource_id: id });
    return { call };
  }
}
