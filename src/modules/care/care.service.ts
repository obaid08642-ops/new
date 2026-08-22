import { Injectable, NotFoundException, Inject } from '@nestjs/common';
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

    const raw = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort(sort).limit(needDistance ? 200 : (offset + limit + (opts.available_today ? 100 : 0)));
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
    const out: any[] = [];
    for (let i = 0; i < slice.length; i++) {
      const dRaw: any = slice[i];
      const d: any = dRaw.toObject ? dRaw.toObject() : dRaw;
      let nextAvailableAt: string | null = null;
      if (i < 10) {
        const docFull = dRaw.toObject ? dRaw : await this.providerModel.findOne({ id: d.id });
        nextAvailableAt = docFull ? await this.slots.nextAvailable(docFull as any) : null;
      }
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
  async doctorSlots(id: string, date: string, service_type: 'clinic' | 'video' | 'home') {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER });
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

  /** Public discovery must return an allowlisted card/detail model, never raw provider records. */
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
      bio: d.bio || null,
      languages: Array.isArray(d.languages) ? d.languages : [],
      accepts_insurance: Boolean(d.accepts_insurance),
      insurance_clinic: Boolean(d.insurance_clinic),
      insurance_online: Boolean(d.insurance_online),
      insurance_home: Boolean(d.insurance_home),
      accepted_insurance: Array.isArray(d.accepted_insurance) ? d.accepted_insurance : [],
      clinicPhotos: Array.isArray(d.clinic_images) ? d.clinic_images : [],
      next_available_at: nextAvailableAt,
    };
    if (typeof distanceKm === 'number' && Number.isFinite(distanceKm)) publicDoctor.distance_km = Math.round(distanceKm * 10) / 10;
    return publicDoctor;
  }

  /** Facilities share only patient-facing profile data; contacts, exact location and contracts remain private. */
  private toPublicFacility(raw: any) {
    const f = raw?.toObject ? raw.toObject() : raw;
    return {
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
      rating: f.rating ?? null,
      reviews_count: f.reviews_count ?? 0,
    };
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
