"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("../../common/enums");
const slot_service_1 = require("./slot.service");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const user_repository_1 = require("./repositories/user.repository");
const facility_repository_1 = require("./repositories/facility.repository");
const MAX_PUBLIC_SEARCH_LENGTH = 80;
const PUBLIC_PROVIDER_FILTER = {
    status: enums_1.ProviderStatus.ACTIVE,
    public_eligibility: true,
    medical_review_status: 'approved',
};
const PUBLIC_FACILITY_FILTER = {
    is_active: true,
    public_eligibility: true,
    medical_review_status: 'approved',
};
function publicSearchRegex(value) {
    const normalized = value?.trim().slice(0, MAX_PUBLIC_SEARCH_LENGTH);
    if (!normalized)
        return null;
    return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
let CareService = class CareService {
    constructor(providerModel, userModel, facilityModel, slots) {
        this.providerModel = providerModel;
        this.userModel = userModel;
        this.facilityModel = facilityModel;
        this.slots = slots;
    }
    async specialties() {
        const live = await this.providerModel.aggregate([
            { $match: { type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER } },
            { $group: { _id: '$specialty', count: { $sum: 1 } } },
        ]);
        const liveMap = new Map(live.map((x) => [x._id, x.count]));
        return enums_1.SPECIALTY_MASTER.map((s) => {
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
    insuranceCompanies() {
        return enums_1.INSURANCE_COMPANIES.map((slug) => ({ slug }));
    }
    academicDegrees() {
        return enums_1.ACADEMIC_DEGREES_LIST.map((slug) => ({ slug }));
    }
    async listDoctors(opts = {}) {
        const q = { type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER };
        if (opts.specialty)
            q.specialty = opts.specialty;
        if (opts.service_type)
            q.consultation_modes = { $in: [opts.service_type] };
        if (opts.city)
            q.city = opts.city;
        if (opts.facility_id)
            q.facility_id = opts.facility_id;
        if (opts.degree)
            q.academic_degree = opts.degree;
        if (opts.insurance)
            q.accepted_insurance = { $in: [opts.insurance] };
        if (opts.accepts_insurance !== undefined)
            q.accepts_insurance = opts.accepts_insurance;
        const searchRegex = publicSearchRegex(opts.q);
        if (searchRegex) {
            q.$or = [
                { name_ar: searchRegex }, { name_en: searchRegex }, { specialty: searchRegex }, { hospital: searchRegex },
            ];
        }
        const sort = {};
        const needDistance = opts.sort === 'distance_asc' || opts.sort === 'distance_desc';
        if (opts.sort === 'price_asc')
            sort.price_clinic = 1;
        else if (opts.sort === 'price_desc')
            sort.price_clinic = -1;
        else if (opts.sort === 'experience')
            sort.years_experience = -1;
        else if (!needDistance)
            sort.rating = -1;
        const page = Math.max(1, opts.page || 1);
        const limit = Math.min(50, Math.max(5, opts.limit || 20));
        const offset = (page - 1) * limit;
        const total = await this.providerModel.countDocuments(q);
        const raw = await this.providerModel.find(q, { _id: 0, __v: 0 }).sort(sort).limit(needDistance ? 200 : (offset + limit + (opts.available_today ? 100 : 0)));
        let docs = raw;
        if (needDistance && opts.lat != null && opts.lng != null) {
            docs = docs.map((d) => {
                const obj = d.toObject ? d.toObject() : d;
                const loc = obj.location;
                const dist = (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number')
                    ? haversineKm(opts.lat, opts.lng, loc.lat, loc.lng) : 9999;
                return { ...obj, _distance_km: dist };
            }).sort((a, b) => opts.sort === 'distance_asc' ? a._distance_km - b._distance_km : b._distance_km - a._distance_km);
        }
        if (opts.available_today) {
            const filtered = [];
            for (const d of docs) {
                const docFull = d.toObject ? d : await this.providerModel.findOne({ id: d.id });
                if (docFull && await this.slots.hasSlotsToday(docFull))
                    filtered.push(d);
                if (filtered.length >= offset + limit + 1)
                    break;
            }
            docs = filtered;
        }
        const slice = docs.slice(offset, offset + limit);
        const out = [];
        for (let i = 0; i < slice.length; i++) {
            const dRaw = slice[i];
            const d = dRaw.toObject ? dRaw.toObject() : dRaw;
            let nextAvailableAt = null;
            if (i < 10) {
                const docFull = dRaw.toObject ? dRaw : await this.providerModel.findOne({ id: d.id });
                nextAvailableAt = docFull ? await this.slots.nextAvailable(docFull) : null;
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
    async doctorById(id) {
        const doc = await this.providerModel.findOne({ id, type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER }, { _id: 0, __v: 0 });
        if (!doc)
            throw new common_1.NotFoundException('doctor_not_found');
        const obj = this.toPublicDoctor(doc, await this.slots.nextAvailable(doc));
        if (obj.facility_id) {
            const facility = await this.facilityModel.findOne({ id: obj.facility_id, ...PUBLIC_FACILITY_FILTER }, { _id: 0, __v: 0 });
            obj.facility = facility ? this.toPublicFacility(facility) : null;
        }
        const reviews = await this.providerModel.db
            .collection('reviews')
            .find({ provider_id: obj.id, status: 'approved' })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();
        obj.reviews_data = reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            text: r.comment || '',
            date: r.createdAt || null,
        }));
        obj.clinicPhotos = Array.isArray(obj.clinic_images) ? obj.clinic_images : [];
        const similar = await this.providerModel.find({ type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER, specialty: obj.specialty, id: { $ne: obj.id } }, { _id: 0, __v: 0 }).limit(3);
        obj.similarDoctors = similar.map(d => {
            const s = d.toObject();
            return this.toPublicDoctor(s);
        });
        return obj;
    }
    async doctorSlots(id, date, service_type) {
        const doc = await this.providerModel.findOne({ id, type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER });
        if (!doc)
            throw new common_1.NotFoundException('doctor_not_found');
        return this.slots.slotsForDate(doc, date, service_type);
    }
    async smartSearch(q) {
        const out = { doctors: [], specialties: [], facilities: [] };
        if (!q || !q.trim())
            return out;
        const re = publicSearchRegex(q);
        if (!re)
            return out;
        const docs = await this.providerModel
            .find({ type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER,
            $or: [{ name_ar: re }, { name_en: re }, { specialty: re }] }, { _id: 0, __v: 0 })
            .limit(8);
        out.doctors = docs.map((d) => this.toPublicDoctor(d));
        const specs = await this.specialties();
        out.specialties = specs.filter((s) => re.test(s.specialty) || re.test(s.name_en));
        const facilities = await this.facilityModel
            .find({ ...PUBLIC_FACILITY_FILTER, $or: [{ name_ar: re }, { name_en: re }] }, { _id: 0, __v: 0 })
            .limit(5);
        out.facilities = facilities.map((f) => this.toPublicFacility(f));
        return out;
    }
    async listFacilities(opts = {}) {
        const q = { ...PUBLIC_FACILITY_FILTER };
        if (opts.city)
            q.city = opts.city;
        if (opts.type)
            q.type = opts.type;
        if (opts.specialty)
            q.departments = { $in: [opts.specialty] };
        const searchRegex = publicSearchRegex(opts.q);
        if (searchRegex) {
            q.$or = [{ name_ar: searchRegex }, { name_en: searchRegex }];
        }
        const facilities = await this.facilityModel.find(q, { _id: 0, __v: 0 }).limit(Math.min(50, Math.max(1, opts.limit || 50)));
        return facilities.map((f) => this.toPublicFacility(f));
    }
    async facilityById(id) {
        const f = await this.facilityModel.findOne({ id, ...PUBLIC_FACILITY_FILTER }, { _id: 0, __v: 0 });
        if (!f)
            throw new common_1.NotFoundException('facility_not_found');
        const obj = this.toPublicFacility(f);
        const doctors = await this.providerModel
            .find({ facility_id: id, type: enums_1.ProviderType.DOCTOR, ...PUBLIC_PROVIDER_FILTER }, { _id: 0, __v: 0 })
            .limit(50);
        obj.doctors = doctors.map((d) => this.toPublicDoctor(d));
        return obj;
    }
    toPublicDoctor(raw, nextAvailableAt = null, distanceKm) {
        const d = raw?.toObject ? raw.toObject() : raw;
        const publicDoctor = {
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
        if (typeof distanceKm === 'number' && Number.isFinite(distanceKm))
            publicDoctor.distance_km = Math.round(distanceKm * 10) / 10;
        return publicDoctor;
    }
    toPublicFacility(raw) {
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
};
exports.CareService = CareService;
exports.CareService = CareService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(1, (0, common_1.Inject)('UserRepository')),
    __param(2, (0, common_1.Inject)('FacilityRepository')),
    __metadata("design:paramtypes", [providerprofile_repository_1.ProviderProfileRepository,
        user_repository_1.UserRepository,
        facility_repository_1.FacilityRepository,
        slot_service_1.SlotService])
], CareService);
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
//# sourceMappingURL=care.service.js.map