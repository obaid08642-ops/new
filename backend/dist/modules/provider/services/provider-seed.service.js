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
exports.ProviderSeedService = void 0;
const common_1 = require("@nestjs/common");
const provider_request_engine_service_1 = require("./provider-request-engine.service");
const requests_schema_1 = require("../schemas/requests.schema");
const provider_scoring_service_1 = require("./provider-scoring.service");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const providernotification_repository_1 = require("./repositories/providernotification.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const labtestcatalogitem_repository_1 = require("./repositories/labtestcatalogitem.repository");
const radiologyservicecatalogitem_repository_1 = require("./repositories/radiologyservicecatalogitem.repository");
const doctorsessiontype_repository_1 = require("./repositories/doctorsessiontype.repository");
const homecareservicecatalogitem_repository_1 = require("./repositories/homecareservicecatalogitem.repository");
const providerdeliveryzone_repository_1 = require("./repositories/providerdeliveryzone.repository");
const providerscheduleslot_repository_1 = require("./repositories/providerscheduleslot.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
let ProviderSeedService = class ProviderSeedService {
    constructor(engine, scoring, requests, notifs, profiles, avails, pharma, lab, rad, doc, hc, zones, slots) {
        this.engine = engine;
        this.scoring = scoring;
        this.requests = requests;
        this.notifs = notifs;
        this.profiles = profiles;
        this.avails = avails;
        this.pharma = pharma;
        this.lab = lab;
        this.rad = rad;
        this.doc = doc;
        this.hc = hc;
        this.zones = zones;
        this.slots = slots;
    }
    async seed(user) {
        assertProvider(user);
        const profile = await this.profiles.findOne({ account_id: user.id });
        if (profile) {
            const needsGeo = !profile.geo || profile.geo.lat == null;
            if (needsGeo) {
                profile.geo = {
                    lat: 24.7136,
                    lng: 46.6753,
                    formatted_address: 'العليا، الرياض',
                    service_radius_km: 15,
                };
                if (!profile.address) {
                    profile.address = { country: 'SA', city: 'الرياض', district: 'العليا' };
                }
                await profile.save();
            }
        }
        await this.avails.findOneAndUpdate({ provider_account_id: user.id }, { provider_account_id: user.id, status: requests_schema_1.ProviderAvailabilityStatus.ACCEPTING_ORDERS, last_online_at: new Date() }, { upsert: true, setDefaultsOnInsert: true });
        const slotPromises = [];
        for (const dow of [0, 1, 2, 3, 4, 6]) {
            slotPromises.push(this.slots.findOneAndUpdate({ provider_account_id: user.id, day_of_week: dow, start_time: '08:00' }, {
                provider_account_id: user.id,
                day_of_week: dow,
                start_time: '08:00',
                end_time: '22:00',
                slot_duration_minutes: 30,
                capacity_per_slot: 3,
                active: true,
            }, { upsert: true, setDefaultsOnInsert: true }));
        }
        await Promise.all(slotPromises);
        await this.zones.findOneAndUpdate({ provider_account_id: user.id, name: 'منطقة الخدمة الرئيسية' }, {
            provider_account_id: user.id,
            name: 'منطقة الخدمة الرئيسية',
            shape: 'circle',
            center: { lat: 24.7136, lng: 46.6753 },
            radius_km: 15,
            base_fee: 15,
            free_delivery_above: 200,
            active: true,
        }, { upsert: true, setDefaultsOnInsert: true });
        const pharmacyItems = [
            { sku: 'PAN-EXT-500', name_ar: 'بانادول إكسترا 500 ملغ', name_en: 'Panadol Extra 500mg', stock: 200, price: 18, category: 'pain' },
            { sku: 'VITC-1000', name_ar: 'فيتامين سي 1000', name_en: 'Vitamin C 1000', stock: 120, price: 32, category: 'vitamins' },
            { sku: 'AMOXIL-500', name_ar: 'أموكسيل 500 ملغ', name_en: 'Amoxil 500mg', stock: 80, price: 26, category: 'antibiotic' },
            { sku: 'OMEPRA-20', name_ar: 'أوميبرازول 20 ملغ', name_en: 'Omeprazole 20mg', stock: 90, price: 22, category: 'gastric' },
        ];
        for (const p of pharmacyItems) {
            await this.pharma.findOneAndUpdate({ provider_account_id: user.id, sku: p.sku }, { ...p, provider_account_id: user.id, available: true, currency: 'SAR' }, { upsert: true, setDefaultsOnInsert: true });
        }
        const labItems = [
            { code: 'CBC', name_ar: 'تعداد دم كامل', name_en: 'Complete Blood Count', sample_type: 'blood', price: 80, turnaround_hours: 6, home_collection_supported: true },
            { code: 'VITD', name_ar: 'فيتامين د', name_en: 'Vitamin D', sample_type: 'blood', price: 150, turnaround_hours: 24, home_collection_supported: true },
            { code: 'GLU-FAST', name_ar: 'سكر صائم', name_en: 'Fasting Glucose', sample_type: 'blood', price: 35, turnaround_hours: 4, home_collection_supported: true },
        ];
        for (const l of labItems) {
            await this.lab.findOneAndUpdate({ provider_account_id: user.id, code: l.code }, { ...l, provider_account_id: user.id, available: true, currency: 'SAR' }, { upsert: true, setDefaultsOnInsert: true });
        }
        const radItems = [
            { scan_type: 'MRI', body_part: 'lumbar_spine', name_ar: 'رنين مغناطيسي - أسفل الظهر', contrast_supported: true, price: 950 },
            { scan_type: 'CT', body_part: 'chest', name_ar: 'أشعة مقطعية - الصدر', contrast_supported: true, price: 720 },
            { scan_type: 'X-Ray', body_part: 'knee', name_ar: 'أشعة سينية - الركبة', contrast_supported: false, price: 180 },
        ];
        for (const r of radItems) {
            await this.rad.findOneAndUpdate({ provider_account_id: user.id, scan_type: r.scan_type, body_part: r.body_part }, { ...r, provider_account_id: user.id, available: true, currency: 'SAR' }, { upsert: true, setDefaultsOnInsert: true });
        }
        const docSessions = [
            { consultation_type: 'video', specialty: 'general', duration_minutes: 30, price: 180 },
            { consultation_type: 'voice', specialty: 'general', duration_minutes: 20, price: 120 },
            { consultation_type: 'chat', specialty: 'general', duration_minutes: 30, price: 80 },
        ];
        for (const d of docSessions) {
            await this.doc.findOneAndUpdate({ provider_account_id: user.id, consultation_type: d.consultation_type, specialty: d.specialty }, { ...d, provider_account_id: user.id, available: true, currency: 'SAR' }, { upsert: true, setDefaultsOnInsert: true });
        }
        const hcItems = [
            { service_type: 'nursing_visit', name_ar: 'زيارة تمريضية منزلية', required_skills: ['IV_insertion', 'wound_dressing'], min_hours: 2, hourly_price: 105 },
            { service_type: 'physio', name_ar: 'علاج طبيعي منزلي', required_skills: ['physiotherapy'], min_hours: 1, hourly_price: 150 },
        ];
        for (const h of hcItems) {
            await this.hc.findOneAndUpdate({ provider_account_id: user.id, service_type: h.service_type }, { ...h, provider_account_id: user.id, available: true, currency: 'SAR' }, { upsert: true, setDefaultsOnInsert: true });
        }
        const existing = await this.requests.find({ provider_account_id: user.id, seeded: true }).lean();
        let createdRequests = existing;
        if (existing.length < 5) {
            const now = new Date();
            const inHour = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);
            const samples = [
                {
                    provider_account_id: user.id,
                    type: requests_schema_1.ProviderRequestType.PHARMACY,
                    patient: { name: 'أحمد علي السبيعي', phone: '+966500000001', age: 34, gender: 'male' },
                    payload: {
                        items: [
                            { name: 'Panadol Extra 500mg', sku: 'PAN-EXT-500', qty: 2, notes: 'لازم بسرعة' },
                            { name: 'Vitamin C 1000mg', sku: 'VITC-1000', qty: 1 },
                        ],
                        delivery_address: { city: 'الرياض', district: 'العليا', street: 'شارع الأمير سلطان', notes: 'الدور الثاني' },
                        prescription_required: false,
                    },
                    summary_ar: 'صرف 2 أصناف صيدلية - توصيل العليا',
                    summary_en: 'Pharmacy order 2 items - Olaya delivery',
                    amount_total: 78,
                    priority: requests_schema_1.ProviderRequestPriority.URGENT,
                    scheduled_at: inHour(1),
                    seeded: true,
                },
                {
                    provider_account_id: user.id,
                    type: requests_schema_1.ProviderRequestType.LAB,
                    patient: { name: 'سارة محمد القحطاني', phone: '+966500000002', age: 28, gender: 'female' },
                    payload: {
                        tests: [{ name: 'CBC', code: 'CBC' }, { name: 'Vitamin D', code: 'VITD' }],
                        sample_type: 'blood',
                        home_collection: true,
                        preferred_date: inHour(24),
                        preferred_time_window: '08:00-10:00',
                        address: { city: 'الرياض', district: 'الملقا' },
                    },
                    summary_ar: 'تحاليل CBC + فيتامين د — سحب منزلي',
                    summary_en: 'CBC + Vitamin D — home collection',
                    amount_total: 230,
                    priority: requests_schema_1.ProviderRequestPriority.NORMAL,
                    scheduled_at: inHour(24),
                    seeded: true,
                },
                {
                    provider_account_id: user.id,
                    type: requests_schema_1.ProviderRequestType.RADIOLOGY,
                    patient: { name: 'محمد خالد العتيبي', phone: '+966500000003', age: 45, gender: 'male' },
                    payload: {
                        scan_type: 'MRI',
                        body_part: 'lumbar_spine',
                        contrast: false,
                        preferred_date: inHour(48),
                        preferred_time_window: '14:00-16:00',
                        referral_note: 'ألم أسفل الظهر مزمن',
                    },
                    summary_ar: 'MRI أسفل الظهر بدون صبغة',
                    summary_en: 'MRI lumbar spine no contrast',
                    amount_total: 950,
                    priority: requests_schema_1.ProviderRequestPriority.NORMAL,
                    scheduled_at: inHour(48),
                    seeded: true,
                },
                {
                    provider_account_id: user.id,
                    type: requests_schema_1.ProviderRequestType.DOCTOR,
                    patient: { name: 'نورة فهد الشمري', phone: '+966500000004', age: 32, gender: 'female' },
                    payload: {
                        consultation_type: 'video',
                        symptoms: ['صداع', 'دوخة', 'إجهاد'],
                        duration_minutes: 30,
                        preferred_date: inHour(3),
                        notes: 'متابعة بعد فحص سابق',
                    },
                    summary_ar: 'استشارة فيديو - صداع ودوخة',
                    summary_en: 'Video consultation - headache & dizziness',
                    amount_total: 180,
                    priority: requests_schema_1.ProviderRequestPriority.NORMAL,
                    scheduled_at: inHour(3),
                    seeded: true,
                },
                {
                    provider_account_id: user.id,
                    type: requests_schema_1.ProviderRequestType.HOME_CARE,
                    patient: { name: 'عبدالله سعد الدوسري', phone: '+966500000005', age: 67, gender: 'male' },
                    payload: {
                        service_type: 'nursing_visit',
                        duration_hours: 4,
                        required_skills: ['IV_insertion', 'wound_dressing'],
                        preferred_date: inHour(12),
                        address: { city: 'الرياض', district: 'حطين', notes: 'الدور الأرضي' },
                        medical_notes: 'مريض سكري - تغيير ضمادة',
                    },
                    summary_ar: 'زيارة منزلية 4 ساعات - تغيير ضمادة',
                    summary_en: '4-hour home visit - wound dressing',
                    amount_total: 420,
                    priority: requests_schema_1.ProviderRequestPriority.NORMAL,
                    scheduled_at: inHour(12),
                    seeded: true,
                },
            ];
            createdRequests = [];
            for (const s of samples) {
                const r = await this.engine.createInternal(s);
                createdRequests.push(r);
            }
        }
        await this.scoring.recompute(user.id).catch(() => null);
        return {
            seeded: true,
            provider_account_id: user.id,
            capabilities: {
                pharmacy: pharmacyItems.length,
                lab: labItems.length,
                radiology: radItems.length,
                doctor_sessions: docSessions.length,
                home_care: hcItems.length,
            },
            zones: 1,
            schedule_slots: 6,
            requests: createdRequests.length,
            message: existing.length >= 5 ? 'Phase 1C data seeded; requests already existed' : 'Phase 1B + 1C data seeded successfully',
        };
    }
    async resetSeed(user) {
        assertProvider(user);
        const reqs = await this.requests.find({ provider_account_id: user.id, seeded: true }, { id: 1 }).lean();
        const ids = reqs.map((r) => r.id);
        await this.requests.deleteMany({ provider_account_id: user.id, seeded: true });
        await this.notifs.deleteMany({ provider_account_id: user.id, related_id: { $in: ids } });
        await Promise.all([
            this.pharma.deleteMany({ provider_account_id: user.id }),
            this.lab.deleteMany({ provider_account_id: user.id }),
            this.rad.deleteMany({ provider_account_id: user.id }),
            this.doc.deleteMany({ provider_account_id: user.id }),
            this.hc.deleteMany({ provider_account_id: user.id }),
            this.zones.deleteMany({ provider_account_id: user.id, name: 'منطقة الخدمة الرئيسية' }),
            this.slots.deleteMany({ provider_account_id: user.id, start_time: '08:00' }),
        ]);
        return { ok: true, removed: ids.length };
    }
};
exports.ProviderSeedService = ProviderSeedService;
exports.ProviderSeedService = ProviderSeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(3, (0, common_1.Inject)('ProviderNotificationRepository')),
    __param(4, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(5, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __param(6, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(7, (0, common_1.Inject)('LabTestCatalogItemRepository')),
    __param(8, (0, common_1.Inject)('RadiologyServiceCatalogItemRepository')),
    __param(9, (0, common_1.Inject)('DoctorSessionTypeRepository')),
    __param(10, (0, common_1.Inject)('HomeCareServiceCatalogItemRepository')),
    __param(11, (0, common_1.Inject)('ProviderDeliveryZoneRepository')),
    __param(12, (0, common_1.Inject)('ProviderScheduleSlotRepository')),
    __metadata("design:paramtypes", [provider_request_engine_service_1.ProviderRequestEngineService,
        provider_scoring_service_1.ProviderScoringService,
        providerrequest_repository_1.ProviderRequestRepository,
        providernotification_repository_1.ProviderNotificationRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository,
        pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        labtestcatalogitem_repository_1.LabTestCatalogItemRepository,
        radiologyservicecatalogitem_repository_1.RadiologyServiceCatalogItemRepository,
        doctorsessiontype_repository_1.DoctorSessionTypeRepository,
        homecareservicecatalogitem_repository_1.HomeCareServiceCatalogItemRepository,
        providerdeliveryzone_repository_1.ProviderDeliveryZoneRepository,
        providerscheduleslot_repository_1.ProviderScheduleSlotRepository])
], ProviderSeedService);
//# sourceMappingURL=provider-seed.service.js.map