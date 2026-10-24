import { AVAILABILITY_WINDOW, NextSlotCache, orderByAvailability } from './availability-order';
import { averageWaitMinutes } from './wait-time';
import { reviewerLabel } from '../ratings/reviewer-label';
import { StorageService } from '../storage/storage.module';
import { policyClass, policyCompanyKeys } from '../../common/insurance-policy';
import { BadRequestException, Injectable, NotFoundException, Inject, Optional } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Facility, FacilityDocument } from '../../schemas/facility.schema';
import { ProviderType, ProviderStatus, SPECIALTY_MASTER, INSURANCE_COMPANIES, ACADEMIC_DEGREES_LIST } from '../../common/enums';
import { SlotService } from './slot.service';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";
import { FacilityRepository } from "./repositories/facility.repository";

const MAX_PUBLIC_SEARCH_LENGTH = 80;
/**
 * A doctor is public only with a verified, unexpired licence (19.3). The daily SCFHS re-check hides a lapsed provider;
 * the expiry test here keeps one off the lists in the hours before it runs. No expiry date on file passes: the date
 * is held by verification, and `license_verified` is the gate.
 */
const publicProviderFilter = () => ({
  status: ProviderStatus.ACTIVE,
  public_eligibility: true,
  medical_review_status: 'approved',
  license_verified: true,
  license_expiry_date: { $not: { $lte: new Date() } },
});
const PUBLIC_FACILITY_FILTER = {
  is_active: true,
  public_eligibility: true,
  medical_review_status: 'approved',
};

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
    @Optional() private readonly storage?: StorageService,
  ) {}

  /** ===== Specialties — merge master registry with live counts ===== */
  async specialties() {
    const live: any[] = await this.providerModel.aggregate([
      { $match: { type: ProviderType.DOCTOR, ...publicProviderFilter() } },
      { $group: { _id: '$specialty', count: { $sum: 1 } } },
    ]);
    const liveMap = new Map<string, number>(live.map((x) => [x._id, x.count]));
    return SPECIALTY_MASTER.map((s) => {
      // Profiles store the canonical specialty slug; Arabic/English fallbacks
      // retain compatibility with older imported records without counting
      // unpublished providers.
      const publishedProviderCount = liveMap.get(s.slug) || liveMap.get(s.name_ar) || liveMap.get(s.name_en) || 0;
      return {
        slug: s.slug,
        specialty: s.name_ar,
        name_ar: s.name_ar,
        name_en: s.name_en,
        count: publishedProviderCount,
        published_provider_count: publishedProviderCount,
      };
    });
  }

  /** ===== Insurance companies ===== */
  insuranceCompanies() {
    return INSURANCE_COMPANIES.map((slug) => ({ slug }));
  }

  /** ===== Academic degrees ===== */
  academicDegrees() {
    return ACADEMIC_DEGREES_LIST.map((slug) => ({ slug }));
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
    insuranceClass?: string;
    /** payment=insurance: filter by the signed-in patient's own saved company and class. */
    paymentInsurance?: boolean;
    accepts_insurance?: boolean;
    /** Design parity (#1819): the doctor's stored gender (male | female) and a price band on the price of the chosen mode. */
    gender?: 'male' | 'female';
    price_min?: number;
    price_max?: number;
    lat?: number;
    lng?: number;
    sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance' | 'distance_asc' | 'distance_desc' | 'available_today';
    nearest_type?: 'clinic' | 'video' | 'home_visit';
    user?: any;
    available_type?: 'clinic' | 'video' | 'home_visit';
    available_within?: number;
    page?: number;
    limit?: number;
  } = {}) {
    // Self-pay lists are never filtered; only payment=insurance reads the patient's saved policy.
    let insuranceCompany = opts.insurance;
    let insuranceKeys = insuranceCompany ? [insuranceCompany] : [];
    let insuranceClass = opts.insuranceClass;
    if (opts.paymentInsurance && !insuranceCompany && opts.user) {
      const profile = await this.providerModel.db.collection('patient_profiles').findOne({ user_id: opts.user.id }, { projection: { insurance: 1 } });
      if (policyCompanyKeys(profile?.insurance).length) {
        insuranceKeys = policyCompanyKeys(profile.insurance);
        insuranceCompany = insuranceKeys[0];
        insuranceClass = policyClass(profile.insurance) || undefined;
      }
    }
    const q: any = { type: ProviderType.DOCTOR, ...publicProviderFilter() };
    if (opts.specialty) q.specialty = opts.specialty;
    if (opts.service_type) q.consultation_modes = { $in: [opts.service_type] };
    if (opts.city) q.city = opts.city;
    if (opts.facility_id) q.facility_id = opts.facility_id;
    if (opts.degree) q.academic_degree = opts.degree;
    // Company AND class when both are given (contracts: { company_id, classes, active } in insurance_class_contracts); a
    // company alone also matches the older plain-id entries of accepted_insurance.
    if (insuranceCompany && insuranceClass) {
      q.$and = [{ insurance_class_contracts: { $elemMatch: { company_id: { $in: insuranceKeys }, classes: insuranceClass, active: { $ne: false } } } }];
    } else if (insuranceCompany) {
      q.$and = [{ $or: [
        { accepted_insurance: { $in: insuranceKeys } },
        { insurance_class_contracts: { $elemMatch: { company_id: { $in: insuranceKeys }, active: { $ne: false } } } },
      ] }];
    }
    if (opts.accepts_insurance !== undefined) q.accepts_insurance = opts.accepts_insurance;
    if (opts.gender) q.gender = opts.gender;
    const priceField = opts.service_type === 'video' ? 'price_online' : opts.service_type === 'home' ? 'price_home' : 'price_clinic';
    if (opts.price_min !== undefined || opts.price_max !== undefined) {
      const band: Record<string, number> = { $gt: 0 };
      if (opts.price_min !== undefined) band.$gte = opts.price_min;
      if (opts.price_max !== undefined) band.$lte = opts.price_max;
      q[priceField] = band;
    }
    const searchRegex = publicSearchRegex(opts.q);
    if (searchRegex) {
      q.$or = [
        { name_ar: searchRegex }, { name_en: searchRegex }, { specialty: searchRegex }, { hospital: searchRegex },
      ];
    }
    // Q-13 "Available now": built on the existing SlotService engine (schedules,
    // approved leave, bookings) plus the 5-minute buffer and active slot holds.
    // No second slot engine: candidate slots come from slotsForDate.
    if (opts.available_within !== undefined) return this.listAvailable(q, opts);
    // Q-12 "Nearest": sort=distance is answered by the DB (2dsphere $geoNear),
    // clinic and home-visit only; video has no meaningful "near".
    if (opts.sort === 'distance') return this.listNearest(q, opts);
    if (opts.sort === 'available_today') return this.listByAvailability(q, opts);
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

    const raw = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort(sort).maxTimeMS(5000).limit(needDistance ? 200 : (offset + limit + (opts.available_today ? 100 : 0)));
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
      const filtered: any[] = [];
      for (const d of docs) {
        const docFull = d.toObject ? d : await this.providerModel.findOne({ id: d.id });
        if (docFull && await this.slots.hasSlotsToday(docFull as any)) filtered.push(d);
        if (filtered.length >= offset + limit + 1) break;
      }
      docs = filtered;
    }

    const slice = docs.slice(offset, offset + limit);
    const online = await this.onlineSet(slice);
    // P14.3: the next free time of the first 10 doctors, read together (each is 3 queries since nextAvailable
    // preloads its 14 days), not one doctor after another.
    const out: any[] = await Promise.all(slice.map(async (dRaw: any, i: number) => {
      const d: any = dRaw.toObject ? dRaw.toObject() : dRaw;
      let nextAvailableAt: string | null = null;
      if (i < 10) {
        const docFull = dRaw.toObject ? dRaw : await this.providerModel.findOne({ id: d.id });
        nextAvailableAt = docFull ? await this.slots.nextAvailable(docFull as any) : null;
      }
      return { ...this.toPublicDoctor(d, nextAvailableAt, d._distance_km), is_online: this.isOnlineDoc(d, online) };
    }));
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

  private readonly nextSlotCache = new NextSlotCache();

  /**
   * sort=available_today: the best AVAILABILITY_WINDOW doctors by rating are ordered by real free slots (today first, then soonest),
   * then paged. Each doctor's next slot is cached for a minute and computed ten at a time, so the cost stays bounded.
   */
  private async listByAvailability(q: any, opts: { page?: number; limit?: number }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(50, Math.max(5, opts.limit || 20));
    const offset = (page - 1) * limit;
    const raw: any[] = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ rating: -1 }).maxTimeMS(5000).limit(AVAILABILITY_WINDOW);
    const withNext: Array<{ doc: any; next: string | null }> = [];
    for (let i = 0; i < raw.length; i += 10) {
      const batch = raw.slice(i, i + 10);
      withNext.push(...await Promise.all(batch.map(async (doc) => {
        const id = String((doc.toObject ? doc.toObject() : doc).id);
        const cached = this.nextSlotCache.get(id);
        if (cached.hit) return { doc, next: cached.value };
        const full = doc.toObject ? doc : await this.providerModel.findOne({ id });
        const next = full ? await this.slots.nextAvailable(full as any) : null;
        this.nextSlotCache.set(id, next);
        return { doc, next };
      })));
    }
    const ordered = orderByAvailability(withNext);
    const slice = ordered.slice(offset, offset + limit);
    const online = await this.onlineSet(slice.map((x) => x.doc));
    const items = slice.map((x) => {
      const d: any = x.doc.toObject ? x.doc.toObject() : x.doc;
      return { ...this.toPublicDoctor(d, x.next), is_online: this.isOnlineDoc(d, online) };
    });
    return { page, limit, total: null, total_is_exact: false, has_more: ordered.length > offset + limit, items };
  }

  /**
   * Q-13 "Available now": doctors with a free slot STARTING within the window,
   * nearest start first, each carrying next_slot_at. Video counts an online,
   * accepting doctor (next_slot_at = now); the switch never counts for clinic/home.
   */
  private async listAvailable(baseFilter: any, opts: any) {
    const minutes = opts.available_within;
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes <= 0) {
      throw new BadRequestException('available_within must be a positive whole number of minutes');
    }
    const mode = opts.available_type === 'home_visit' ? 'home' : (opts.available_type as any) || opts.service_type;
    if (!mode) throw new BadRequestException('type is required with available_within');
    const q: any = { ...baseFilter };
    if (mode === 'home') q.consultation_modes = { $in: ['home'] };
    else if (mode === 'video') q.consultation_modes = { $in: ['video'] };
    else q.consultation_modes = { $in: ['clinic'] };

    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(50, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;
    const now = Date.now();
    const end = now + minutes * 60_000;
    const BUFFER_MS = 5 * 60_000;
    const SLOT_MIN = 30;

    const dayStr = (t: number) => new Date(t).toISOString().substring(0, 10);
    const blockers = await this.availabilityBlockers(now, end);
    const out: Array<{ doc: any; at: number }> = [];
    // No capped batch: every mode-matching public doctor is scanned, otherwise
    // doctors created later (or lower-rated) would never be found. The mode
    // filter keeps the set small; the window scan is per-day, not per-doctor-history.
    const candidates: any[] = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ rating: -1 }).maxTimeMS(5000).limit(2000); // 14.15
    for (const dRaw of candidates) {
      const d: any = dRaw?.toObject ? dRaw.toObject() : dRaw;
      const ids = [d.account_id, d.user_id, d.id].filter(Boolean).map(String);
      if (mode === 'video' && await this.isOnlineAccepting(ids)) {
        out.push({ doc: d, at: now });
        continue;
      }
      let earliest: number | null = null;
      const midnight = new Date(new Date(now).toISOString().substring(0, 10) + 'T24:00:00Z').getTime();
      const days = end > midnight ? [dayStr(now), dayStr(now + 24 * 3600_000)] : [dayStr(now)];
      for (const ds of days) {
        let r: any;
        try {
          r = await this.slots.slotsForDate(d as any, ds, mode);
        } catch { continue; }
        for (const s of r.slots || []) {
          const start = Date.parse(s.start);
          if (!Number.isFinite(start) || start < now || start > end) continue;
          if (s.available === false) continue;
          if (this.slotBlocked(start, SLOT_MIN, d, ids, blockers, now)) continue;
          if (earliest === null || start < earliest) earliest = start;
        }
        if (earliest !== null && ds === dayStr(now)) break;
      }
      if (earliest !== null) out.push({ doc: d, at: earliest });
    }
    // 2-app#10 / 2-web#10: "nearest free doctor" - with sort=distance and the patient's position (clinic and home visit;
    // video has no meaningful "near"), the doctors free in the window are ordered by distance, then by the earliest start.
    // A doctor without a location comes after those with one.
    const near = opts.sort === 'distance' && mode !== 'video' && this.validPoint(opts.lat, opts.lng);
    const distanceOf = (doc: any): number | null => {
      const c = doc?.geoPoint?.coordinates;
      const lat = Array.isArray(c) ? Number(c[1]) : Number(doc?.location?.lat);
      const lng = Array.isArray(c) ? Number(c[0]) : Number(doc?.location?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? haversineKm(opts.lat, opts.lng, lat, lng) : null;
    };
    const ranked = out.map((row) => ({ ...row, km: near ? distanceOf(row.doc) : null }));
    ranked.sort((a, b) => {
      if (near) {
        if (a.km === null && b.km !== null) return 1;
        if (b.km === null && a.km !== null) return -1;
        if (a.km !== null && b.km !== null && a.km !== b.km) return a.km - b.km;
      }
      return a.at - b.at;
    });
    const slice = ranked.slice(offset, offset + limit);
    const items: any[] = [];
    for (const { doc, at, km } of slice) {
      const pub: any = this.toPublicDoctor(doc, null, km ?? undefined);
      pub.next_slot_at = new Date(at).toISOString();
      items.push(pub);
    }
    return {
      page, limit, total: null, total_is_exact: false,
      has_more: out.length > offset + limit, items,
    };
  }

  private validPoint(lat: unknown, lng: unknown): boolean {
    return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
  }

  /** Bookings + active holds overlapping [start, start + dur), with the 5-minute post-booking buffer. */
  private slotBlocked(start: number, durMin: number, doc: any, ids: string[], blockers: any, now: number): boolean {
    const finish = start + durMin * 60_000;
    for (const b of blockers.bookings) {
      if (String(b.doctor_id) !== String(doc.id)) continue;
      const bs = new Date(b.slot_start).getTime();
      const be = new Date(b.slot_end).getTime();
      if (!Number.isFinite(bs) || !Number.isFinite(be)) continue;
      if (start < be + 5 * 60_000 && finish > bs) return true;
    }
    for (const h of blockers.holds) {
      const hp = [h.provider_id, h.provider_account_id, h.account_id].filter(Boolean).map(String);
      if (!hp.some((x: string) => ids.includes(x)) && String(h.provider_id) !== String(doc.id)) continue;
      if (String(h.status) !== 'held' || new Date(h.expires_at).getTime() <= now) continue;
      const hs = new Date(h.slot_start).getTime();
      const he = new Date(h.slot_end).getTime();
      if (!Number.isFinite(hs) || !Number.isFinite(he)) continue;
      if (start < he && finish > hs) return true;
    }
    return false;
  }

  /** Only what can overlap the search window [from, to + one slot]: not every active booking on the platform. */
  private async availabilityBlockers(from: number, to: number): Promise<{ bookings: any[]; holds: any[] }> {
    const db = (this.providerModel as any).db;
    const windowStart = new Date(from - 5 * 60_000);
    const windowEnd = new Date(to + 2 * 60 * 60_000);
    const [bookings, holds] = await Promise.all([
      db.collection('appointments').find(
        {
          status: { $in: ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] },
          slot_end: { $gte: windowStart },
          slot_start: { $lte: windowEnd },
        },
        { projection: { _id: 0, doctor_id: 1, slot_start: 1, slot_end: 1 } },
      ).toArray().catch(() => []),
      db.collection('slotlocks').find(
        { status: 'held', expires_at: { $gt: new Date() }, slot_end: { $gte: windowStart }, slot_start: { $lte: windowEnd } },
        { projection: { _id: 0, provider_id: 1, provider_account_id: 1, account_id: 1, slot_start: 1, slot_end: 1, status: 1, expires_at: 1 } },
      ).toArray().catch(() => []),
    ]);
    return { bookings, holds };
  }

  /** Design parity (#1819): which of these doctors are online and accepting now, read together (2 queries for the page). */
  private async onlineSet(docs: any[]): Promise<Set<string>> {
    const ids = [...new Set(docs.flatMap((raw) => { const d = raw?.toObject ? raw.toObject() : raw; return [d?.account_id, d?.user_id, d?.id]; }).filter(Boolean).map(String))];
    if (!ids.length) return new Set();
    // A failed availability read must not fail the list: the badge then reads "not online", nothing else changes.
    try {
      const db = (this.providerModel as any).db;
      const [a, b] = await Promise.all([
        db.collection('provider_availability').find({ provider_account_id: { $in: ids }, status: 'accepting_orders' }, { projection: { _id: 0, provider_account_id: 1 } }).toArray(),
        db.collection('provideravailability').find({ provider_id: { $in: ids }, instant_available: true }, { projection: { _id: 0, provider_id: 1 } }).toArray(),
      ]);
      return new Set<string>([...a.map((r: any) => String(r.provider_account_id)), ...b.map((r: any) => String(r.provider_id))]);
    } catch {
      return new Set();
    }
  }

  private isOnlineDoc(raw: any, online: Set<string>): boolean {
    const d = raw?.toObject ? raw.toObject() : raw;
    return [d?.account_id, d?.user_id, d?.id].filter(Boolean).some((x) => online.has(String(x)));
  }

  /** Provider app online toggle: provider_availability accepting_orders OR provideravailability instant_available. */
  private async isOnlineAccepting(ids: string[]): Promise<boolean> {
    if (!ids.length) return false;
    const db = (this.providerModel as any).db;
    const [a, b] = await Promise.all([
      db.collection('provider_availability').findOne({ provider_account_id: { $in: ids }, status: 'accepting_orders' }, { projection: { _id: 1 } }).catch(() => null),
      db.collection('provideravailability').findOne({ provider_id: { $in: ids }, instant_available: true }, { projection: { _id: 1 } }).catch(() => null),
    ]);
    return !!(a || b);
  }

  /**
   * Q-12 "Nearest": DB-answered nearest doctors (2dsphere $geoNear, never a
   * capped in-memory sort). Clinic and home-visit only. Without a location the
   * signed-in patient's city is the fallback (distance_km then null).
   */
  private async listNearest(baseFilter: any, opts: any) {
    const mode = opts.nearest_type;
    if (mode === 'video') throw new BadRequestException('nearest_not_for_video');
    const q: any = { ...baseFilter };
    if (mode === 'home_visit') q.consultation_modes = { $in: ['home'] };
    else if (mode === 'clinic') q.consultation_modes = { $in: ['clinic'] };
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(50, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;

    const latOk = typeof opts.lat === 'number' && Number.isFinite(opts.lat) && Math.abs(opts.lat) <= 90;
    const lngOk = typeof opts.lng === 'number' && Number.isFinite(opts.lng) && Math.abs(opts.lng) <= 180;
    if (latOk && lngOk) {
      const extra = opts.available_today ? 100 : 1;
      const pipe: any[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [opts.lng, opts.lat] },
            distanceField: '_dist_m',
            spherical: true,
            query: q,
          },
        },
        { $skip: offset },
        { $limit: limit + extra },
      ];
      let docs: any[] = await this.providerModel.aggregate(pipe);
      if (opts.available_today) {
        const filtered: any[] = [];
        for (const d of docs) {
          if (await this.slots.hasSlotsToday(d as any)) filtered.push(d);
          if (filtered.length >= limit + 1) break;
        }
        docs = filtered;
      }
      const hasMore = docs.length > limit;
      const slice = docs.slice(0, limit);
      const out: any[] = [];
      for (let i = 0; i < slice.length; i++) {
        const d: any = slice[i];
        let nextAvailableAt: string | null = null;
        if (i < 10) nextAvailableAt = await this.slots.nextAvailable(d as any);
        out.push(this.toPublicDoctor(d, nextAvailableAt, (d._dist_m ?? 0) / 1000));
      }
      return { page, limit, total: null, total_is_exact: false, has_more: hasMore, items: out };
    }

    // No usable location: fall back to the signed-in patient's city.
    const me: any = opts.user?.id ? await this.userModel.findOne({ id: opts.user.id }) : null;
    const city = (me?.toObject ? me.toObject() : me)?.city;
    if (!city) throw new BadRequestException('location_required');
    const cityDocs: any[] = await this.providerModel.find(
      { ...q, city }, { _id: 0, __v: 0 },
    ).sort({ rating: -1 }).skip(offset).limit(limit + 1);
    const hasMore = cityDocs.length > limit;
    const out: any[] = [];
    for (let i = 0; i < Math.min(cityDocs.length, limit); i++) {
      const dRaw: any = cityDocs[i];
      const d: any = dRaw?.toObject ? dRaw.toObject() : dRaw;
      out.push(this.toPublicDoctor(d, i < 10 ? await this.slots.nextAvailable(dRaw as any) : null));
    }
    return { page, limit, total: null, total_is_exact: false, has_more: hasMore, items: out };
  }

  /** ===== Doctor detail (with facility join) ===== */
  async doctorById(id: string) {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...publicProviderFilter() }, { _id: 0, __v: 0 });
    if (!doc) throw new NotFoundException('doctor_not_found');
    const obj: any = this.toPublicDoctor(doc, await this.slots.nextAvailable(doc));
    if (obj.facility_id) {
      const facility = await this.facilityModel.findOne({ id: obj.facility_id, ...PUBLIC_FACILITY_FILTER }, { _id: 0, __v: 0 });
      obj.facility = facility ? this.toPublicFacility(facility) : null;
    }
    
    // Real published reviews only — never fabricated testimonials. The reviews patients submit today live in `ratings`
    // (keyed by the account that did the service); the older `reviews` collection is read when a doctor has none there.
    const doctorKeys = [obj.id, (doc as any).account_id, (doc as any).user_id].filter(Boolean).map(String);
    const db = this.providerModel.db;
    const rated: any[] = await db.collection('ratings')
      .find({ provider_id: { $in: doctorKeys }, status: 'published' } as any, { projection: { _id: 0, score: 1, comment: 1, user_name: 1, createdAt: 1, sub_ratings: 1 } })
      .sort({ createdAt: -1 }).limit(10).toArray();
    if (rated.length) {
      // The reviewer is shown by first name only: a public page never carries a patient's full name or account id.
      obj.reviews_data = rated.map((r: any) => ({
        rating: r.score,
        text: r.comment || '',
        date: r.createdAt || null,
        reviewer: reviewerLabel(r.user_name),
        sub_ratings: r.sub_ratings ?? null,
      }));
    } else {
      const reviews: any[] = await db.collection('reviews')
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
    }
    obj.is_online = this.isOnlineDoc(doc, await this.onlineSet([doc]));
    // Education proof the admin approved on the certificates screen: the kind and the issuer only, never the file or number.
    const accountKeys = [(doc as any).user_id, (doc as any).account_id].filter(Boolean).map(String);
    let certs: any[] = [];
    try {
      if (accountKeys.length) certs = await db.collection('provider_documents').find({ account_id: { $in: accountKeys }, doc_type: { $in: ['academic_certificate', 'board_certificate'] }, review_status: 'approved' } as any, { projection: { _id: 0, doc_type: 1, issuer: 1, issued_date: 1 } }).toArray();
    } catch { certs = []; }
    obj.education_verified = certs.map((c: any) => ({ type: c.doc_type, issuer: c.issuer ?? null, issued_date: c.issued_date ?? null }));
    // Average clinic waiting time (check-in to start), only once there are enough completed clinic appointments.
    try {
      obj.avg_wait_minutes = averageWaitMinutes(await this.slots.completedClinicHistories(obj.id, 200));
    } catch { obj.avg_wait_minutes = null; }

    // Real photos only (empty when the provider published none): toPublicDoctor already gives clinicPhotos as public
    // addresses; the raw clinic_images (private file ids) are not part of the public model

    // Similar doctors — real fields only, no fabricated rating/price fallbacks
    const similar = await this.providerModel.find({ type: ProviderType.DOCTOR, ...publicProviderFilter(), specialty: obj.specialty, id: { $ne: obj.id } }, { _id: 0, __v: 0 }).limit(3);
    obj.similarDoctors = similar.map(d => {
      const s = d.toObject();
      return this.toPublicDoctor(s);
    });

    return obj;
  }

  /** ===== Slots ===== */
  async doctorSlots(id: string, date: string, service_type: 'clinic' | 'video' | 'home') {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...publicProviderFilter() });
    if (!doc) throw new NotFoundException('doctor_not_found');
    return this.slots.slotsForDate(doc, date, service_type);
  }

  /** ===== Global search (doctors + specialties + facilities) ===== */
  async smartSearch(q: string) {
    const out: any = { doctors: [], specialties: [], facilities: [] };
    if (!q || !q.trim()) return out;
    const re = publicSearchRegex(q);
    if (!re) return out;
    const docs = await this.providerModel
      .find({ type: ProviderType.DOCTOR, ...publicProviderFilter(),
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
      .find({ facility_id: id, type: ProviderType.DOCTOR, ...publicProviderFilter() }, { _id: 0, __v: 0 })
      .limit(50);
    obj.doctors = doctors.map((d) => this.toPublicDoctor(d));
    return obj;
  }

  /** Public discovery must return an allowlisted card/detail model, never raw provider records. */
  /** A doctor's image as a public address: an http(s) URL as it is, a stored file through GET /care/doctors/:id/media/:mediaId. */
  private publicMediaUrl(doctorId: string, media: string): string {
    return /^https?:\/\//i.test(String(media)) ? media : `/api/v1/care/doctors/${encodeURIComponent(doctorId)}/media/${encodeURIComponent(media)}`;
  }

  /** The image behind a doctor's public media address, only for a public doctor and only one of that doctor's own images. */
  async doctorMedia(id: string, mediaId: string) {
    const doc: any = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...publicProviderFilter() }, { _id: 0, profile_photo: 1, clinic_images: 1 }).lean();
    const own = [doc?.profile_photo, ...(Array.isArray(doc?.clinic_images) ? doc.clinic_images : [])].filter(Boolean).map(String);
    if (!doc || !own.includes(mediaId) || !this.storage) throw new NotFoundException('media_not_found');
    const image = await this.storage.publicProfileImage(mediaId);
    if (!image) throw new NotFoundException('media_not_found');
    return image;
  }

  private toPublicDoctor(raw: any, nextAvailableAt: string | null = null, distanceKm?: number) {
    const d = raw?.toObject ? raw.toObject() : raw;
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
      // Averages of the published sub-ratings (doctor / clinic / waiting time); null until a patient has given one.
      sub_ratings: { doctor: d.sub_ratings_avg?.doctor ?? null, clinic: d.sub_ratings_avg?.clinic ?? null, waiting: d.sub_ratings_avg?.waiting ?? null },
      bio: d.bio || null,
      languages: Array.isArray(d.languages) ? d.languages : [],
      accepts_insurance: Boolean(d.accepts_insurance),
      insurance_clinic: Boolean(d.insurance_clinic),
      insurance_online: Boolean(d.insurance_online),
      insurance_home: Boolean(d.insurance_home),
      accepted_insurance: Array.isArray(d.accepted_insurance) ? d.accepted_insurance : [],
      // 2-web#3 / 2-app#13: the photo and clinic photos as addresses anyone can open (a stored file goes through the public
      // media route of this doctor; an http(s) address is kept as it is)
      photo_url: d.profile_photo ? this.publicMediaUrl(d.id, d.profile_photo) : null,
      clinicPhotos: (Array.isArray(d.clinic_images) ? d.clinic_images : []).map((m: string) => this.publicMediaUrl(d.id, m)),
      // Q-20 / D-17: verified only when the admin approved the doctor AND the licence was verified; plus the SCFHS number.
      verified: d.medical_review_status === 'approved' && d.license_verified === true,
      scfhs_license_no: d.scfhs_license_number || null,
      // The licence line the page draws ("licensed by SCFHS, no. X"): number, authority, and whether it was verified. No date.
      license: { number: d.scfhs_license_number || null, authority: 'SCFHS', verified: d.medical_review_status === 'approved' && d.license_verified === true },
      next_available_at: nextAvailableAt,
      // Owner-approved profile fields (2026-10-24). The clinic's address and point only: the doctor's personal `address`
      // and `location` are never part of this model.
      gender: d.gender === 'male' || d.gender === 'female' ? d.gender : null,
      education: (Array.isArray(d.education) ? d.education : []).map((e: any) => ({ university: e?.university ?? null, graduation_year: e?.graduation_year ?? null, fellowship_board: e?.fellowship_board ?? null })),
      follow_up: typeof d.follow_up_price === 'number' ? { price: d.follow_up_price, window_days: d.follow_up_window_days ?? null } : null,
      procedures: (Array.isArray(d.procedures) ? d.procedures : []).map((p: any) => ({ name_ar: p?.name_ar ?? null, name_en: p?.name_en ?? null, price: p?.price ?? null })),
      clinic: d.clinic_address || d.clinic_location
        ? { address: d.clinic_address || null, lat: typeof d.clinic_location?.lat === 'number' ? d.clinic_location.lat : null, lng: typeof d.clinic_location?.lng === 'number' ? d.clinic_location.lng : null }
        : null,
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
