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
      { $match: { type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE } },
      { $group: { _id: '$specialty', count: { $sum: 1 } } },
    ]);
    const liveMap = new Map<string, number>(live.map((x) => [x._id, x.count]));
    return SPECIALTY_MASTER.map((s) => ({
      slug: s.slug,
      specialty: s.name_ar,
      name_ar: s.name_ar,
      name_en: s.name_en,
      count: liveMap.get(s.name_ar) || 0,
    }));
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
    const q: any = { type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE };
    if (opts.specialty) q.specialty = opts.specialty;
    if (opts.service_type) q.consultation_modes = { $in: [opts.service_type] };
    if (opts.city) q.city = opts.city;
    if (opts.facility_id) q.facility_id = opts.facility_id;
    if (opts.degree) q.academic_degree = opts.degree;
    if (opts.insurance) q.accepted_insurance = { $in: [opts.insurance] };
    if (opts.accepts_insurance !== undefined) q.accepts_insurance = opts.accepts_insurance;
    if (opts.q && opts.q.trim()) {
      const re = new RegExp(opts.q.trim(), 'i');
      q.$or = [
        { name_ar: re }, { name_en: re }, { specialty: re }, { hospital: re },
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

    const raw = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort(sort).limit(needDistance ? 200 : (limit + (opts.available_today ? 20 : 0)));
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
        if (filtered.length >= limit) break;
      }
      docs = filtered;
    }

    const slice = docs.slice(0, limit);
    const out: any[] = [];
    for (let i = 0; i < slice.length; i++) {
      const dRaw: any = slice[i];
      const d: any = dRaw.toObject ? dRaw.toObject() : dRaw;
      if (i < 10) {
        const docFull = dRaw.toObject ? dRaw : await this.providerModel.findOne({ id: d.id });
        d.next_available_at = docFull ? await this.slots.nextAvailable(docFull as any) : null;
      } else d.next_available_at = null;
      out.push(d);
    }
    return { page, limit, total: out.length, items: out };
  }

  /** ===== Doctor detail (with facility join) ===== */
  async doctorById(id: string) {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR }, { _id: 0, __v: 0 });
    if (!doc) throw new NotFoundException('doctor_not_found');
    const obj: any = doc.toObject();
    obj.next_available_at = await this.slots.nextAvailable(doc);
    if (obj.facility_id) {
      const facility = await this.facilityModel.findOne({ id: obj.facility_id }, { _id: 0, __v: 0 });
      obj.facility = facility?.toObject() || null;
    }
    
    // Fallbacks for UI Rich Details
    obj.services = [
      { id: '1', nameAr: 'استشارة أونلاين', icon: 'video' },
      { id: '2', nameAr: 'متابعة', icon: 'calendarCheck' },
      { id: '3', nameAr: 'زيارة عيادة', icon: 'hospital' },
      { id: '4', nameAr: 'تقييم مخاطر', icon: 'monitor_heart' },
      { id: '5', nameAr: 'كشف منزلي', icon: 'home' },
    ];
    obj.education = obj.education || [
      { degree: 'دكتوراه الطب', school: 'جامعة الملك سعود', year: '2008' },
      { degree: 'زمالة دولية', school: 'كلية الجراحين الملكية بلندن', year: '2012' },
    ];
    obj.certifications = obj.certifications || ['زمالة', 'بورد', 'البورد العربي'];
    obj.memberships = obj.memberships || ['الجمعية السعودية', 'الجمعية الأوروبية'];
    obj.faq = obj.faq || [
      { q: 'ما هي مدة الاستشارة؟', a: 'تتراوح مدة الاستشارة من 15 إلى 30 دقيقة حسب الحالة.' },
      { q: 'هل يقبل التأمين الطبي؟', a: 'نعم، نقبل معظم شركات التأمين الكبرى.' },
    ];
    obj.reviews_data = [
      { id: '1', name: 'أحمد محمد', rating: 5, text: 'دكتور ممتاز ويشرح بالتفصيل.', date: 'منذ 5 أيام' },
      { id: '2', name: 'سارة عبدالله', rating: 5, text: 'متعاون ومحترف جداً.', date: 'منذ أسبوع' },
    ];
    obj.clinicPhotos = obj.clinic_images?.length ? obj.clinic_images : [
      'https://cdn.nabdahplus.com/clinics/clinic1.jpg',
      'https://cdn.nabdahplus.com/clinics/clinic2.jpg',
    ];
    
    const daysArr = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const monthsArr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const calendar = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      calendar.push({
        day: daysArr[d.getDay()],
        date: d.getDate(),
        month: monthsArr[d.getMonth()],
        available: true,
        isToday: i === 0,
        fullDate: d.toISOString().substring(0, 10),
      });
    }
    obj.calendar = calendar;
    
    obj.timeSlots = {
      morning: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'],
      afternoon: ['01:00', '01:30', '02:00', '02:30', '03:00'],
      evening: ['06:00', '06:30', '07:00', '07:30'],
    };

    const similar = await this.providerModel.find({ type: ProviderType.DOCTOR, specialty: obj.specialty, id: { $ne: obj.id } }, { _id: 0, __v: 0 }).limit(3);
    obj.similarDoctors = similar.map(d => {
      const s = d.toObject();
      return { id: s.id, name: s.name_ar, spec: s.specialty, rating: s.rating || 4.5, price: s.price_clinic || 300 };
    });

    return obj;
  }

  /** ===== Slots ===== */
  async doctorSlots(id: string, date: string, service_type: 'clinic' | 'video' | 'home') {
    const doc = await this.providerModel.findOne({ id, type: ProviderType.DOCTOR });
    if (!doc) throw new NotFoundException('doctor_not_found');
    return this.slots.slotsForDate(doc, date, service_type);
  }

  /** ===== Global search (doctors + specialties + facilities) ===== */
  async smartSearch(q: string) {
    const out: any = { doctors: [], specialties: [], facilities: [] };
    if (!q || !q.trim()) return out;
    const re = new RegExp(q.trim(), 'i');
    const docs = await this.providerModel
      .find({ type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE,
        $or: [{ name_ar: re }, { name_en: re }, { specialty: re }] }, { _id: 0, __v: 0 })
      .limit(8);
    out.doctors = docs;
    const specs = await this.specialties();
    out.specialties = specs.filter((s: any) => re.test(s.specialty) || re.test(s.name_en));
    const facilities = await this.facilityModel
      .find({ is_active: true, $or: [{ name_ar: re }, { name_en: re }] }, { _id: 0, __v: 0 })
      .limit(5);
    out.facilities = facilities;
    return out;
  }

  // ============= FACILITIES =============
  async listFacilities(opts: { city?: string; type?: string; specialty?: string; q?: string; limit?: number } = {}) {
    const q: any = { is_active: true };
    if (opts.city) q.city = opts.city;
    if (opts.type) q.type = opts.type;
    if (opts.specialty) q.departments = { $in: [opts.specialty] };
    if (opts.q && opts.q.trim()) {
      const re = new RegExp(opts.q.trim(), 'i');
      q.$or = [{ name_ar: re }, { name_en: re }];
    }
    return this.facilityModel.find(q, { _id: 0, __v: 0 }).limit(opts.limit || 50);
  }

  async facilityById(id: string) {
    const f = await this.facilityModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!f) throw new NotFoundException('facility_not_found');
    const obj: any = f.toObject();
    // Hydrate doctors of this facility
    const doctors = await this.providerModel
      .find({ facility_id: id, type: ProviderType.DOCTOR, status: ProviderStatus.ACTIVE }, { _id: 0, __v: 0 })
      .limit(50);
    obj.doctors = doctors.map((d) => d.toObject());
    return obj;
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

