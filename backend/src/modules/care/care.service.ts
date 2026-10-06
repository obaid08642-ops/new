import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Facility, FacilityDocument } from '../../schemas/facility.schema';
import { ProviderType, ProviderStatus } from '../../common/enums';
import { SlotService } from './slot.service';
import { APPOINTMENT_MINUTES, ApprovedSlot, BLOCKING_APPOINTMENT_STATUSES, Range, appointmentRanges, candidateSlots, dayStartOf, markAvailability, onLeave, windowsFor } from './availability';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";
import { FacilityRepository } from "./repositories/facility.repository";

const MAX_PUBLIC_SEARCH_LENGTH = 80;
const PUBLIC_PROVIDER_FILTER = {
  status: ProviderStatus.ACTIVE,
  public_eligibility: true,
  medical_review_status: 'approved',
};
const PUBLIC_FACILITY_FILTER = {
  is_active: true,
  public_eligibility: true,
  medical_review_status: 'approved',
};

/**
 * Q41 (performance): the doctor list used to fetch whole provider documents
 * (`{_id:0, __v:0}` = every field) and then ran per-doctor availability scans.
 * The public card only renders an allowlisted subset, and availability can be
 * derived from three batched range reads. This exclusion keeps every field
 * `toPublicDoctor` and the batched availability scan need, while dropping the
 * heavy/private blobs (rosters, registration snapshots, verification logs,
 * insurance contracts, document urls) from the list read.
 */
const DOCTOR_LIST_EXCLUDED = {
  _id: 0,
  __v: 0,
  license_documents: 0,
  insurance_contracts: 0,
  verification_logs: 0,
  registration_steps: 0,
  doctors_roster: 0,
  lab_roster: 0,
  radiology_roster: 0,
  nursing_roster: 0,
  nursing_services: 0,
  equipment_list: 0,
} as const;

const DAY_MS = 24 * 3600_000;
/** Card preview horizon — must match SlotService.nextAvailable (14 days). */
const NEXT_AVAILABLE_DAYS = 14;

function publicSearchRegex(value?: string): RegExp | null {
  const normalized = value?.trim().slice(0, MAX_PUBLIC_SEARCH_LENGTH);
  if (!normalized) return null;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/**
 * Care discovery / search / doctor listings.
 * NOTE: Doctors are stored as ProviderProfile records of type=DOCTOR.
 *       We expose a doctor-centric REST surface under /api/v2/care/*
 */
@Injectable()
export class CareService {
  constructor(
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('FacilityRepository') private facilityModel: FacilityRepository,
    private slots: SlotService,
  ) {}

  /** ===== Specialties — merge master registry with live counts ===== */
  async specialties() {
    const live: any[] = await this.providerModel.aggregate([
      { $match: { type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER } },
      { $group: { _id: '$specialty', count: { $sum: 1 } } },
    ]);
    const liveMap = new Map<string, number>(live.map((x) => [x._id, x.count]));
    // F9/R11: the admin-managed specialties collection is the single source.
    // The hard-coded SPECIALTY_MASTER fallback is gone: an admin-added specialty
    // reaches patients, and a removed one disappears.
    // A read failure surfaces as an error, never as "no specialties".
    const source: any[] = await (this.providerModel as any).db?.collection('specialties')
      ?.find({ active: { $ne: false } }, { projection: { _id: 0 } }).toArray() || [];
    return source.map((s: any) => {
      // Profiles store the canonical specialty slug; Arabic/English fallbacks
      // retain compatibility with older imported records without counting
      // unpublished providers.
      const slug = s.slug || s.code;
      const publishedProviderCount = liveMap.get(slug) || liveMap.get(s.name_ar) || liveMap.get(s.name_en) || 0;
      return {
        slug,
        specialty: s.name_ar,
        name_ar: s.name_ar,
        name_en: s.name_en,
        count: publishedProviderCount,
        published_provider_count: publishedProviderCount,
      };
    });
  }

  /** ===== Insurance companies — F9/R11: DB is the single source ===== */
  async insuranceCompanies() {
    try {
      // Q85: insurers use is_active / catalog_status, not `active`: same public filter as
      // /catalogs/insurance, and public fields only (no created_by/updated_by/deleted_at).
      const rows: any[] = await (this.providerModel as any).db?.collection('insurance_companies')
        ?.find({ is_active: true }, { projection: { _id: 0, id: 1, code: 1, name_ar: 1, name_en: 1, logo_url: 1, image_url: 1, is_active: 1 } }).toArray() || [];
      return rows;
    } catch { return []; }
  }

  /** ===== Academic degrees — F9/R11: DB is the single source ===== */
  async academicDegrees() {
    try {
      const rows: any[] = await (this.providerModel as any).db?.collection('academic_degrees')
        ?.find({ active: { $ne: false } }, { projection: { _id: 0 } }).toArray() || [];
      return rows;
    } catch { return []; }
  }

  /** ===== Doctor listing with filters ===== */
  async listDoctors(opts: {
    specialty?: string;
    service_type?: 'clinic' | 'video' | 'home';
    available_today?: boolean;
    q?: string;
    city?: string;
    facility_id?: string;
    degree?: string;
    insurance?: string;
    accepts_insurance?: boolean;
    lat?: number;
    lng?: number;
    sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance_asc' | 'distance_desc';
    page?: number;
    limit?: number;
  } = {}) {
    const q: any = { type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER };
    if (opts.specialty) q.specialty = opts.specialty;
    if (opts.service_type) q.consultation_modes = { $in: [opts.service_type] };
    if (opts.city) q.city = opts.city;
    if (opts.facility_id) q.facility_id = opts.facility_id;
    if (opts.degree) q.academic_degree = opts.degree;
    if (opts.insurance) q.accepted_insurance = { $in: [opts.insurance] };
    if (opts.accepts_insurance !== undefined) q.accepts_insurance = opts.accepts_insurance;
    const searchRegex = publicSearchRegex(opts.q);
    if (searchRegex) {
      q.$or = [
        { name_ar: searchRegex }, { name_en: searchRegex }, { specialty: searchRegex }, { hospital: searchRegex },
      ];
    }
    const sort: any = {};
    const needDistance = opts.sort === 'distance_asc' || opts.sort === 'distance_desc';
    if (opts.sort === 'price_asc') sort.price_clinic = 1;
    else if (opts.sort === 'price_desc') sort.price_clinic = -1;
    else if (opts.sort === 'experience') sort.years_experience = -1;
    else if (!needDistance) sort.rating = -1;

    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(50, Math.max(5, opts.limit || 20));
    const offset = (page - 1) * limit;
    const total = await this.providerModel.countDocuments(q);

    // Q41: projection — fetch the public card fields + the schedule inputs the
    // availability scan needs, not whole provider documents. `location` is only
    // needed for the in-memory distance sort.
    const projection: any = { ...DOCTOR_LIST_EXCLUDED };
    if (!needDistance) projection.location = 0;
    const raw = await this.providerModel.find(q, projection).sort(sort).limit(needDistance ? 200 : (offset + limit + (opts.available_today ? 100 : 0)));
    let docs: any[] = raw as any;

    if (needDistance && opts.lat != null && opts.lng != null) {
      docs = docs.map((d: any) => {
        const obj = d.toObject ? d.toObject() : d;
        const loc = obj.location;
        const dist = (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number')
          ? haversineKm(opts.lat!, opts.lng!, loc.lat, loc.lng) : 9999;
        return { ...obj, _distance_km: dist };
      }).sort((a: any, b: any) => opts.sort === 'distance_asc' ? a._distance_km - b._distance_km : b._distance_km - a._distance_km);
    }

    if (opts.available_today) {
      // Q41: was per-doctor `hasSlotsToday()` (up to 3 queries each, serially).
      // One batched day-0 scan now covers every candidate (3 range reads total).
      const hasToday = await this.batchHasSlotsToday(docs);
      const filtered: any[] = [];
      for (const d of docs) {
        const plain = d.toObject ? d.toObject() : d;
        if (plain && hasToday.get(plain.id)) filtered.push(d);
        if (filtered.length >= offset + limit + 1) break;
      }
      docs = filtered;
    }

    const slice = docs.slice(offset, offset + limit);
    // Q41: was `slots.nextAvailable()` per card (up to 14 days x 3 queries per
    // doctor, serially — ~420 queries for 10 cards). One batched 14-day scan
    // now covers the whole page (3 range reads total). Response shape is
    // unchanged: `next_available_at` is still a slot ISO string or null.
    const nextMap = await this.batchNextAvailable(slice);
    const out: any[] = [];
    for (let i = 0; i < slice.length; i++) {
      const dRaw: any = slice[i];
      const d: any = dRaw.toObject ? dRaw.toObject() : dRaw;
      const nextAvailableAt: string | null = nextMap.get(d.id) ?? null;
      out.push(this.toPublicDoctor(d, nextAvailableAt, d._distance_km));
    }
    const totalIsExact = !opts.available_today && !needDistance;
    return {
      page,
      limit,
      total: totalIsExact ? total : null,
      total_is_exact: totalIsExact,
      has_more: opts.available_today
        ? docs.length > offset + limit
        : (totalIsExact ? page * limit < total : raw.length > offset + limit),
      items: out,
    };
  }

  /** ===== Doctor detail (with facility join) ===== */
  async doctorById(id: string) {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER }, { _id: 0, __v: 0 });
    if (!doc) throw new NotFoundException('doctor_not_found');
    const obj: any = this.toPublicDoctor(doc, await this.slots.nextAvailable(doc));
    if (obj.facility_id) {
      const facility = await this.facilityModel.findOne({ id: obj.facility_id, ...PUBLIC_FACILITY_FILTER }, { _id: 0, __v: 0 });
      obj.facility = facility ? this.toPublicFacility(facility) : null;
    }
    
    // Real approved reviews only — never fabricated testimonials
    const reviews: any[] = await this.providerModel.db
      .collection('reviews')
      .find({ provider_id: obj.id, status: 'approved' } as any)
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    obj.reviews_data = reviews.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      text: r.comment || '',
      date: r.createdAt || null,
    }));

    // Real photos only (empty when the provider published none)
    obj.clinicPhotos = Array.isArray(obj.clinic_images) ? obj.clinic_images : [];

    // Similar doctors — real fields only, no fabricated rating/price fallbacks
    const similar = await this.providerModel.find({ type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER, specialty: obj.specialty, id: { $ne: obj.id } }, { _id: 0, __v: 0 }).limit(3);
    obj.similarDoctors = similar.map(d => {
      const s = d.toObject();
      return this.toPublicDoctor(s);
    });

    return obj;
  }

  /** ===== Slots ===== */
  async doctorSlots(id: string, date: string, service_type: 'clinic' | 'video' | 'home', viewerIds: string[] = []) {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER });
    if (!doc) throw new NotFoundException('doctor_not_found');
    return this.slots.slotsForDate(doc, date, service_type, APPOINTMENT_MINUTES, viewerIds);
  }

  /** ===== Global search (doctors + specialties + facilities) ===== */
  async smartSearch(q: string) {
    const out: any = { doctors: [], specialties: [], facilities: [] };
    if (!q || !q.trim()) return out;
    const re = publicSearchRegex(q);
    if (!re) return out;
    const docs = await this.providerModel
      .find({ type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER,
        $or: [{ name_ar: re }, { name_en: re }, { specialty: re }] }, { _id: 0, __v: 0 })
      .limit(8);
    out.doctors = docs.map((d: any) => this.toPublicDoctor(d));
    const specs = await this.specialties();
    out.specialties = specs.filter((s: any) => re.test(s.specialty) || re.test(s.name_en));
    const facilities = await this.facilityModel
      .find({ ...PUBLIC_FACILITY_FILTER, $or: [{ name_ar: re }, { name_en: re }] }, { _id: 0, __v: 0 })
      .limit(5);
    out.facilities = facilities.map((f: any) => this.toPublicFacility(f));
    return out;
  }

  // ============= FACILITIES =============
  async listFacilities(opts: { city?: string; type?: string; specialty?: string; q?: string; limit?: number } = {}) {
    const q: any = { ...PUBLIC_FACILITY_FILTER };
    if (opts.city) q.city = opts.city;
    if (opts.type) q.type = opts.type;
    if (opts.specialty) q.departments = { $in: [opts.specialty] };
    const searchRegex = publicSearchRegex(opts.q);
    if (searchRegex) {
      q.$or = [{ name_ar: searchRegex }, { name_en: searchRegex }];
    }
    const facilities = await this.facilityModel.find(q, { _id: 0, __v: 0 }).limit(Math.min(50, Math.max(1, opts.limit || 50)));
    return facilities.map((f: any) => this.toPublicFacility(f));
  }

  async facilityById(id: string) {
    const f = await this.facilityModel.findOne({ id, ...PUBLIC_FACILITY_FILTER }, { _id: 0, __v: 0 });
    if (!f) throw new NotFoundException('facility_not_found');
    const obj: any = this.toPublicFacility(f);
    // Hydrate doctors of this facility
    const doctors = await this.providerModel
      .find({ facility_id: id, type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER }, { _id: 0, __v: 0 })
      .limit(50);
    obj.doctors = doctors.map((d) => this.toPublicDoctor(d));
    return obj;
  }

  /**
   * Q41: batched replacement for per-doctor `SlotService.nextAvailable()`.
   * The old list loop ran up to 14 days x 3 queries per card, serially.
   * This loads three index-friendly range reads for the whole page —
   * appointments in the horizon, overlapping approved leaves, weekly schedule
   * slots — then replays the same SlotService rules (approved slots first,
   * then per-mode schedule, then legacy working_hours; approved leave blocks
   * the day; booked slots unavailable; >=15 min lead time) in memory.
   * Falls back to the per-doctor path if raw collections are unreachable.
   */
  private async batchNextAvailable(docs: any[]): Promise<Map<string, string | null>> {
    const plains = docs.map((d) => (d && d.toObject ? d.toObject() : d)).filter((d) => d && d.id);
    const result = new Map<string, string | null>(plains.map((p) => [p.id, null]));
    if (!plains.length) return result;
    const batch = await this.loadAvailabilityBatch(plains, NEXT_AVAILABLE_DAYS);
    if (!batch) {
      for (const p of plains) {
        try { result.set(p.id, await this.slots.nextAvailable(p as any)); }
        catch { result.set(p.id, null); }
      }
      return result;
    }
    for (const p of plains) result.set(p.id, firstAvailableSlot(p, batch));
    return result;
  }

  /**
   * Q41: batched replacement for per-doctor `SlotService.hasSlotsToday()`.
   * Same three range reads, restricted to today, shared with the card scan.
   */
  private async batchHasSlotsToday(docs: any[]): Promise<Map<string, boolean>> {
    const plains = docs.map((d) => (d && d.toObject ? d.toObject() : d)).filter((d) => d && d.id);
    const result = new Map<string, boolean>(plains.map((p) => [p.id, false]));
    if (!plains.length) return result;
    const batch = await this.loadAvailabilityBatch(plains, 1);
    if (!batch) {
      for (const p of plains) {
        try { result.set(p.id, await this.slots.hasSlotsToday(p as any)); }
        catch { result.set(p.id, false); }
      }
      return result;
    }
    for (const p of plains) result.set(p.id, hasAvailableSlotOnDay(p, batch, batch.dayStrs[0]));
    return result;
  }

  /**
   * The three batched reads. All are equality + range predicates over indexed
   * fields (`appointments`: doctor_id/slot_start, `leaverequests`:
   * provider_account_id/status, `provider_schedule_slots`:
   * provider_account_id). Returns null when raw collection access is
   * unavailable so callers can fall back to the per-doctor path.
   */
  private async loadAvailabilityBatch(plains: any[], days: number): Promise<AvailabilityBatch | null> {
    try {
      const db = (this.providerModel as any)?.db;
      if (!db || typeof db.collection !== 'function') return null;
      const now = Date.now();
      const todayUtc = new Date(now);
      const windowStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
      const windowEnd = new Date(windowStart.getTime() + days * 24 * 3600_000);
      const dayStrs: string[] = [];
      for (let i = 0; i < days; i++) {
        dayStrs.push(new Date(windowStart.getTime() + i * 24 * 3600_000).toISOString().substring(0, 10));
      }
      const doctorIds = [...new Set(plains.map((p) => p.id))];
      const accountIds = [...new Set(plains.map((p) => p.account_id).filter(Boolean))];
      const linkIds = [...new Set(plains.flatMap((p) => [p.account_id, p.user_id]).filter(Boolean))];

      // Blocking appointments and other patients' active holds overlapping the
      // horizon (a slot just before midnight can meet a booking after it).
      const bookingsByDoctor = new Map<string, Range[]>();
      const holdsByDoctor = new Map<string, Range[]>();
      if (doctorIds.length) {
        const rows: any[] = await db.collection('appointments').find(
          { doctor_id: { $in: doctorIds }, status: { $in: [...BLOCKING_APPOINTMENT_STATUSES] }, slot_start: { $lt: new Date(windowEnd.getTime() + DAY_MS) }, slot_end: { $gt: windowStart } },
          { projection: { _id: 0, doctor_id: 1, slot_start: 1, slot_end: 1, duration_minutes: 1 } },
        ).toArray().catch(() => []);
        for (const r of rows) bookingsByDoctor.set(r.doctor_id, [...(bookingsByDoctor.get(r.doctor_id) || []), ...appointmentRanges([r], 30)]);
        const holds: any[] = await db.collection('slotlocks').find(
          { provider_id: { $in: doctorIds }, status: 'held', expires_at: { $gt: new Date(now) }, slot_start: { $lt: new Date(windowEnd.getTime() + DAY_MS) }, slot_end: { $gt: windowStart } },
          { projection: { _id: 0, provider_id: 1, slot_start: 1, slot_end: 1 } },
        ).toArray().catch(() => []);
        for (const h of holds) holdsByDoctor.set(h.provider_id, [...(holdsByDoctor.get(h.provider_id) || []), { s: new Date(h.slot_start).getTime(), e: new Date(h.slot_end).getTime() }]);
      }

      let leaves: any[] = [];
      if (linkIds.length) {
        leaves = await db.collection('leaverequests').find(
          { provider_account_id: { $in: linkIds }, status: 'approved', start_date: { $lt: windowEnd }, end_date: { $gte: windowStart } },
          { projection: { _id: 0, provider_account_id: 1, start_date: 1, end_date: 1 } },
        ).toArray().catch(() => []);
      }

      const schedByAccount = new Map<string, any[]>();
      if (accountIds.length) {
        const rows: any[] = await db.collection('provider_schedule_slots').find(
          { provider_account_id: { $in: accountIds }, active: { $ne: false } },
          { projection: { _id: 0, provider_account_id: 1, day_of_week: 1, service_type: 1, start_time: 1, end_time: 1 } },
        ).toArray().catch(() => []);
        for (const r of rows) {
          const arr = schedByAccount.get(r.provider_account_id) || [];
          arr.push(r);
          schedByAccount.set(r.provider_account_id, arr);
        }
      }
      return { now, dayStrs, bookingsByDoctor, holdsByDoctor, leaves, schedByAccount };
    } catch {
      return null;
    }
  }

  /** Public discovery must return an allowlisted card/detail model, never raw provider records. */
  private toPublicDoctor(raw: any, nextAvailableAt: string | null = null, distanceKm?: number) {    const d = raw?.toObject ? raw.toObject() : raw;
    const publicDoctor: any = {
      id: d.id,
      slug: d.slug ?? null,
      name_ar: d.display_name_ar || d.name_ar || null,
      name_en: d.display_name_en || d.name_en || null,
      specialty: d.specialty || null,
      sub_specialties: Array.isArray(d.sub_specialties) ? d.sub_specialties : [],
      title: d.title || null,
      academic_degree: d.academic_degree || null,
      years_experience: d.years_experience ?? null,
      consultation_modes: Array.isArray(d.consultation_modes) ? d.consultation_modes : [],
      price_clinic: d.price_clinic ?? null,
      price_online: d.price_online ?? null,
      price_home: d.price_home ?? null,
      hospital: d.hospital || null,
      facility_id: d.facility_id || null,
      city: d.city || null,
      district: d.district || null,
      rating: d.rating_avg ?? d.rating ?? null,
      reviews_count: d.rating_count ?? d.reviews_count ?? 0,
      bio: d.bio || null,
      languages: Array.isArray(d.languages) ? d.languages : [],
      accepts_insurance: Boolean(d.accepts_insurance),
      insurance_clinic: Boolean(d.insurance_clinic),
      insurance_online: Boolean(d.insurance_online),
      insurance_home: Boolean(d.insurance_home),
      accepted_insurance: Array.isArray(d.accepted_insurance) ? d.accepted_insurance : [],
      clinicPhotos: Array.isArray(d.clinic_images) ? d.clinic_images : [],
      clinic_name: d.clinic_name || null, // R83: from registration step 3
      clinic_address: d.clinic_address || d.address || null, // R83
      next_available_at: nextAvailableAt,
    };
    if (typeof distanceKm === 'number' && Number.isFinite(distanceKm)) publicDoctor.distance_km = Math.round(distanceKm * 10) / 10;
    return publicDoctor;
  }

  /** Facilities share only patient-facing profile data; contacts, exact location and contracts remain private. */
  private toPublicFacility(raw: any) {
    const f = raw?.toObject ? raw.toObject() : raw;
    // F16: reference listings carry no ratings — omit rather than show fabricated numbers.
    const out: any = {
      id: f.id,
      name_ar: f.name_ar || null,
      name_en: f.name_en || null,
      type: f.type || null,
      description_ar: f.description_ar || null,
      description_en: f.description_en || null,
      city: f.city || null,
      district: f.district || null,
      logo_url: f.logo_url || null,
      images: Array.isArray(f.images) ? f.images : [],
      departments: Array.isArray(f.departments) ? f.departments : [],
      accepts_insurance: Boolean(f.accepts_insurance),
      accepted_insurance: Array.isArray(f.accepted_insurance) ? f.accepted_insurance : [],
    };
    if (f.status !== 'reference') {
      out.rating = f.rating ?? null;
      out.reviews_count = f.reviews_count ?? 0;
    }
    return out;
  }
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Q41: in-memory replay of SlotService rules over one batched read, so the
 * doctor list needs 3 range queries per page instead of N+1 per-doctor scans.
 */
interface AvailabilityBatch {
  now: number;
  dayStrs: string[];
  bookingsByDoctor: Map<string, Range[]>;
  holdsByDoctor: Map<string, Range[]>;
  leaves: Array<{ provider_account_id?: string; start_date?: unknown; end_date?: unknown }>;
  schedByAccount: Map<string, ApprovedSlot[]>;
}

/** First available 30-min slot (ISO) on one day under the shared rule (./availability), or null. */
function firstAvailableOnDay(plain: any, batch: AvailabilityBatch, dateStr: string): string | null {
  const mode = plain.consultation_modes && plain.consultation_modes[0];
  if (!mode) return null;
  const dayStart = dayStartOf(dateStr);
  if (!dayStart) return null;
  const dow = dayStart.getUTCDay();
  const windows = windowsFor(plain, plain.account_id ? batch.schedByAccount.get(plain.account_id) || [] : [], dow, mode);
  if (!windows.length) return null;
  const linkIds = [plain.account_id, plain.user_id].filter(Boolean);
  if (linkIds.length && onLeave(batch.leaves, linkIds, dayStart)) return null;
  const slots = markAvailability(candidateSlots(dayStart, windows, APPOINTMENT_MINUTES, batch.now), APPOINTMENT_MINUTES,
    batch.bookingsByDoctor.get(plain.id) || [], batch.holdsByDoctor.get(plain.id) || []);
  return slots.find((s) => s.available)?.start ?? null;
}

function hasAvailableSlotOnDay(plain: any, batch: AvailabilityBatch, dateStr: string): boolean {
  return firstAvailableOnDay(plain, batch, dateStr) !== null;
}

/** First available slot across the batch horizon (same horizon as SlotService.nextAvailable). */
function firstAvailableSlot(plain: any, batch: AvailabilityBatch): string | null {
  for (const dateStr of batch.dayStrs) {
    const slot = firstAvailableOnDay(plain, batch, dateStr);
    if (slot) return slot;
  }
  return null;
}
