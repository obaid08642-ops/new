"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompatModule = exports.FamilyChatController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const now = () => new Date();
const uid = (u) => u?.id || u?._id || u?.user_id;
async function mustOwnBooking(conn, collection, id, userId) {
    const doc = await conn.collection(collection).findOne({ $or: [{ id }, { _id: id }] });
    if (!doc)
        throw new common_1.NotFoundException('not found');
    const owner = doc.patient_id || doc.user_id;
    if (owner && String(owner) !== String(userId))
        throw new common_1.ForbiddenException('forbidden');
    return doc;
}
let FamilyChatController = class FamilyChatController {
    constructor(conn) {
        this.conn = conn;
    }
    async familyOf(userId) {
        if (!userId)
            throw new common_1.ForbiddenException('authenticated_user_required');
        const group = await this.conn.collection('family_groups').findOne({
            is_deleted: { $ne: true },
            $or: [{ owner_id: userId }, { 'members.user_id': userId }],
        });
        if (!group?.id)
            throw new common_1.ForbiddenException('not_active_family_member');
        return String(group.id);
    }
    async list(u, limit = '50') {
        const owner = await this.familyOf(uid(u));
        const messages = await this.conn
            .collection('familychatmessages')
            .find({ family_id: owner })
            .sort({ created_at: 1 })
            .limit(Math.min(+limit || 50, 200))
            .toArray();
        return { data: messages };
    }
    async send(u, body) {
        if (!body?.text?.trim())
            throw new common_1.BadRequestException('text_required');
        const owner = await this.familyOf(uid(u));
        const msg = {
            id: (0, uuid_1.v4)(),
            family_id: owner,
            sender_id: uid(u),
            sender_name: u?.full_name || u?.name || '',
            text: String(body.text).slice(0, 2000),
            created_at: now(),
        };
        await this.conn.collection('familychatmessages').insertOne(msg);
        return { data: msg };
    }
};
exports.FamilyChatController = FamilyChatController;
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FamilyChatController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FamilyChatController.prototype, "send", null);
exports.FamilyChatController = FamilyChatController = __decorate([
    (0, common_1.Controller)('family/chat'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], FamilyChatController);
let HealthMedsController = class HealthMedsController {
    constructor(conn) {
        this.conn = conn;
    }
    async list(u) {
        const data = await this.conn
            .collection('healthmedications')
            .find({ user_id: uid(u), active: { $ne: false } })
            .sort({ created_at: -1 })
            .toArray();
        return { data };
    }
    async add(u, body) {
        if (!body?.name)
            throw new common_1.BadRequestException('name_required');
        const med = {
            id: (0, uuid_1.v4)(),
            user_id: uid(u),
            name: String(body.name).slice(0, 200),
            dosage: body.dosage ? String(body.dosage).slice(0, 100) : null,
            form: body.form || 'tablet',
            times: Array.isArray(body.times) ? body.times.slice(0, 6) : [],
            source: body.source || 'manual',
            active: true,
            created_at: now(),
        };
        await this.conn.collection('healthmedications').insertOne(med);
        return { data: med };
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthMedsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HealthMedsController.prototype, "add", null);
HealthMedsController = __decorate([
    (0, common_1.Controller)('health/medications'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], HealthMedsController);
let WearablesController = class WearablesController {
    constructor(conn) {
        this.conn = conn;
    }
    async devices(u) {
        const data = await this.conn.collection('wearabledevices').find({ user_id: uid(u) }).toArray();
        return { data };
    }
    async register(u, body) {
        if (!body?.kind)
            throw new common_1.BadRequestException('kind_required');
        const dev = {
            id: (0, uuid_1.v4)(),
            user_id: uid(u),
            kind: String(body.kind).slice(0, 50),
            name: body.name ? String(body.name).slice(0, 100) : null,
            connected_at: now(),
        };
        await this.conn.collection('wearabledevices').updateOne({ user_id: uid(u), kind: dev.kind }, { $set: dev }, { upsert: true });
        return { data: dev };
    }
    async data(u, metric, days = '7') {
        const since = new Date(Date.now() - (+days || 7) * 86400000);
        const q = { user_id: uid(u), recorded_at: { $gte: since } };
        if (metric)
            q.metric = metric;
        const data = await this.conn.collection('wearabledata').find(q).sort({ recorded_at: 1 }).limit(2000).toArray();
        return { data };
    }
    async ingest(u, body) {
        const rows = (Array.isArray(body?.samples) ? body.samples : [body]).filter((s) => s?.metric && s?.value != null);
        if (!rows.length)
            throw new common_1.BadRequestException('samples_required');
        const docs = rows.slice(0, 500).map((s) => ({
            id: (0, uuid_1.v4)(),
            user_id: uid(u),
            metric: String(s.metric).slice(0, 50),
            value: Number(s.value),
            unit: s.unit ? String(s.unit).slice(0, 20) : null,
            source: s.source || 'manual',
            recorded_at: s.recorded_at ? new Date(s.recorded_at) : now(),
        }));
        await this.conn.collection('wearabledata').insertMany(docs);
        return { inserted: docs.length };
    }
};
__decorate([
    (0, common_1.Get)('devices'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WearablesController.prototype, "devices", null);
__decorate([
    (0, common_1.Post)('devices'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WearablesController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('data'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('metric')),
    __param(2, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WearablesController.prototype, "data", null);
__decorate([
    (0, common_1.Post)('data'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WearablesController.prototype, "ingest", null);
WearablesController = __decorate([
    (0, common_1.Controller)('wearables'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], WearablesController);
let HomeCarePackagesController = class HomeCarePackagesController {
    constructor(conn) {
        this.conn = conn;
    }
    async list() {
        const services = await this.conn
            .collection('homecareservices')
            .find({ $or: [{ active: true }, { is_active: true }, { status: 'active' }] })
            .limit(100)
            .toArray();
        const data = services.map((s) => ({
            id: s.id || String(s._id),
            name_ar: s.name_ar,
            name_en: s.name_en || null,
            price: s.price ?? 0,
            duration: s.duration || null,
            category: s.category || 'nursing',
        }));
        return { data };
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HomeCarePackagesController.prototype, "list", null);
HomeCarePackagesController = __decorate([
    (0, common_1.Controller)('home-care/packages'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], HomeCarePackagesController);
const SA_VACCINE_SCHEDULE = [
    { code: 'BCG+HBV0', name_ar: 'بي سي جي + جدري الكبد (ب)', age_weeks: 0, age_label_ar: 'عند الولادة' },
    { code: 'HBV1+DTaP1+IPV1+PCV1+Rota1+Hib1', name_ar: 'الجرعة الأولى السداسية', age_weeks: 8, age_label_ar: 'شهران' },
    { code: 'DTaP2+IPV2+PCV2+Rota2+Hib2', name_ar: 'الجرعة الثانية السداسية', age_weeks: 16, age_label_ar: '4 أشهر' },
    { code: 'DTaP3+IPV3+PCV3+Rota3+Hib3+HBV3', name_ar: 'الجرعة الثالثة السداسية', age_weeks: 24, age_label_ar: '6 أشهر' },
    { code: 'MMR1+Varicella1', name_ar: 'الحصبة والنكاف والحصبة الألمانية + جدري الماء', age_weeks: 52, age_label_ar: '12 شهرًا' },
    { code: 'HepA1+DTaP4+Hib4+PCV4', name_ar: 'التهاب الكبد أ + المعززة', age_weeks: 78, age_label_ar: '18 شهرًا' },
    { code: 'DTaP5+IPV4+MMR2+Varicella2', name_ar: 'الجرعة المعززة قبل المدرسة', age_weeks: 208, age_label_ar: '4-6 سنوات' },
];
let MaternityVaccinesController = class MaternityVaccinesController {
    constructor(conn) {
        this.conn = conn;
    }
    async list(u, babyId) {
        const taken = await this.conn
            .collection('maternityvaccines')
            .find({ user_id: uid(u), ...(babyId ? { baby_id: babyId } : {}) })
            .toArray();
        const takenCodes = new Set(taken.map((t) => t.code));
        return {
            schedule: SA_VACCINE_SCHEDULE.map((v) => ({ ...v, taken: takenCodes.has(v.code) })),
            records: taken,
        };
    }
    async mark(u, body) {
        if (!body?.code)
            throw new common_1.BadRequestException('code_required');
        if (!SA_VACCINE_SCHEDULE.some((v) => v.code === body.code))
            throw new common_1.BadRequestException('unknown_vaccine_code');
        const rec = { id: (0, uuid_1.v4)(), user_id: uid(u), baby_id: body.baby_id || null, code: body.code, taken_at: body.taken_at ? new Date(body.taken_at) : now(), created_at: now() };
        await this.conn.collection('maternityvaccines').updateOne({ user_id: uid(u), code: body.code, baby_id: rec.baby_id }, { $set: rec }, { upsert: true });
        return { data: rec };
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('baby_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaternityVaccinesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MaternityVaccinesController.prototype, "mark", null);
MaternityVaccinesController = __decorate([
    (0, common_1.Controller)('maternity/vaccines'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], MaternityVaccinesController);
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
let NutritionFoodsController = class NutritionFoodsController {
    constructor(conn) {
        this.conn = conn;
    }
    async search(q = '', limit = '30') {
        const col = this.conn.collection('nutritionfoods');
        if ((await col.estimatedDocumentCount()) === 0) {
            await col.insertMany(SEED_FOODS.map(([name_ar, calories, protein, carbs, fat]) => ({
                id: (0, uuid_1.v4)(), name_ar, calories, protein, carbs, fat, per: '100g', verified: true, created_at: now(),
            })));
        }
        const filter = q?.trim() ? { name_ar: { $regex: q.trim(), $options: 'i' } } : {};
        const data = await col.find(filter).limit(Math.min(+limit || 30, 100)).toArray();
        return { data };
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NutritionFoodsController.prototype, "search", null);
NutritionFoodsController = __decorate([
    (0, common_1.Controller)('nutrition/foods'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], NutritionFoodsController);
async function oid(id) {
    const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
    try {
        return new Types.ObjectId(String(id));
    }
    catch {
        throw new common_1.NotFoundException('العنصر غير موجود');
    }
}
const byStringOrObjectId = (id) => {
    const or = [{ id }, { _id: id }];
    if (/^[0-9a-fA-F]{24}$/.test(String(id)))
        or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
    return { $or: or };
};
function haversineKm(aLat, aLng, bLat, bLng) {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}
let OffersDetailController = class OffersDetailController {
    constructor(conn) {
        this.conn = conn;
    }
    async getOffer(id, user) {
        const offer = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id));
        if (!offer)
            throw new common_1.NotFoundException('العرض غير موجود');
        const provider = offer.provider_id
            ? await this.conn.collection('provider_profiles').findOne({
                $or: [{ id: offer.provider_id }, { user_id: offer.provider_id }, { account_id: offer.provider_id }],
            })
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
};
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OffersDetailController.prototype, "getOffer", null);
OffersDetailController = __decorate([
    (0, common_1.Controller)('offers'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], OffersDetailController);
let PromotionsOffersController = class PromotionsOffersController {
    constructor(conn) {
        this.conn = conn;
    }
    async offerProviders(id) {
        const offer = await this.conn.collection('promotioncampaigns').findOne(byStringOrObjectId(id));
        if (!offer)
            throw new common_1.NotFoundException('العرض غير موجود');
        const ids = [offer.provider_id, ...(offer.provider_ids || [])].filter(Boolean).map(String);
        if (!ids.length)
            return [];
        const rows = await this.conn.collection('provider_profiles')
            .find({ $or: [{ id: { $in: ids } }, { user_id: { $in: ids } }, { account_id: { $in: ids } }] })
            .limit(50).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), name: r.name || r.facility_name || '',
            specialty: r.specialty, city: r.city,
            rating_avg: r.rating_avg ?? 0, rating_count: r.rating_count ?? 0,
        }));
    }
};
__decorate([
    (0, common_1.Get)(':id/providers'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PromotionsOffersController.prototype, "offerProviders", null);
PromotionsOffersController = __decorate([
    (0, common_1.Controller)('promotions/offers'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], PromotionsOffersController);
let ReportsTimelineController = class ReportsTimelineController {
    constructor(conn) {
        this.conn = conn;
    }
    async timeline(user) {
        const u = uid(user);
        const rows = await this.conn.collection('medicalreports')
            .find({ patient_id: u }).sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), tracking_id: r.tracking_id,
            kind: r.report_type, title: r.title_ar || r.title_en,
            provider: r.doctor_name, date: r.createdAt, critical: !!r.critical,
        }));
    }
    async byId(id, user) {
        const u = uid(user);
        const r = await this.conn.collection('medicalreports').findOne(byStringOrObjectId(id));
        if (!r)
            throw new common_1.NotFoundException('التقرير غير موجود');
        if (r.patient_id && String(r.patient_id) !== String(u)) {
            throw new common_1.ForbiddenException('لا تملك صلاحية عرض هذا التقرير');
        }
        return { ...r, id: r.id || String(r._id) };
    }
};
__decorate([
    (0, common_1.Get)('timeline'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsTimelineController.prototype, "timeline", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsTimelineController.prototype, "byId", null);
ReportsTimelineController = __decorate([
    (0, common_1.Controller)('reports'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ReportsTimelineController);
let SupportChatController = class SupportChatController {
    constructor(conn) {
        this.conn = conn;
    }
    bareList(user) { return this.list(user); }
    bareSend(user, body) {
        return this.send(user, body);
    }
    async list(user) {
        const u = uid(user);
        const rows = await this.conn.collection('supportchatmessages')
            .find({ account_id: u }).sort({ createdAt: 1 }).limit(300).toArray();
        return rows.map((r) => ({ id: String(r._id), body: r.body, from: r.from, created_at: r.createdAt }));
    }
    async send(user, body) {
        const u = uid(user);
        const text = String(body?.body || body?.message || '').trim();
        if (!text)
            throw new common_1.BadRequestException('نص الرسالة مطلوب');
        let ticket = await this.conn.collection('supporttickets')
            .findOne({ account_id: u, status: { $in: ['open', 'pending'] } });
        if (!ticket) {
            const doc = {
                id: (0, uuid_1.v4)(), account_id: u, subject: text.slice(0, 80),
                status: 'open', priority: 'normal', createdAt: now(), updatedAt: now(),
            };
            await this.conn.collection('supporttickets').insertOne(doc);
            ticket = doc;
        }
        const ins = await this.conn.collection('supportchatmessages').insertOne({
            account_id: u, ticket_id: ticket.id || String(ticket._id),
            from: 'patient', body: text, createdAt: now(),
        });
        await this.conn.collection('supporttickets').updateOne(byStringOrObjectId(ticket.id || String(ticket._id)), { $set: { updatedAt: now(), last_message: text.slice(0, 120) } });
        return { ok: true, id: String(ins.insertedId), ticket_id: ticket.id || String(ticket._id) };
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SupportChatController.prototype, "bareList", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportChatController.prototype, "bareSend", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SupportChatController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SupportChatController.prototype, "send", null);
SupportChatController = __decorate([
    (0, common_1.Controller)('support/chat'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], SupportChatController);
let AuditIngestController = class AuditIngestController {
    constructor(conn) {
        this.conn = conn;
    }
    async one(user, body) {
        await this.conn.collection('clientevents').insertOne({
            account_id: uid(user), kind: String(body?.kind || body?.event || 'generic'),
            screen: body?.screen || null, meta: body?.meta || body?.data || {}, createdAt: now(),
        });
        return { ok: true };
    }
    async batch(user, body) {
        const list = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
        if (list.length) {
            await this.conn.collection('clientevents').insertMany(list.map((e) => ({
                account_id: uid(user), kind: String(e?.kind || e?.event || 'generic'),
                screen: e?.screen || null, meta: e?.meta || e?.data || {}, createdAt: now(),
            })));
        }
        return { ok: true, inserted: list.length };
    }
};
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuditIngestController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuditIngestController.prototype, "batch", null);
AuditIngestController = __decorate([
    (0, common_1.Controller)('audit'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AuditIngestController);
const INTERACTION_RULES = [
    { a: ['warfarin', 'وارفارين'], b: ['aspirin', 'أسبرين', 'ibuprofen', 'ايبوبروفين'], severity: 'high', note_ar: 'زيادة خطر النزيف — راجع الطبيب فوراً' },
    { a: ['metformin', 'ميتفورمين'], b: ['alcohol', 'كحول'], severity: 'moderate', note_ar: 'خطر الحماض اللبني — تجنب الكحول' },
    { a: ['lisinopril', 'ليزينوبريل'], b: ['potassium', 'بوتاسيوم'], severity: 'moderate', note_ar: 'ارتفاع البوتاسيوم — مراقبة دورية' },
    { a: ['sildenafil', 'سيلدينافيل'], b: ['nitroglycerin', 'نيتروجليسرين'], severity: 'high', note_ar: 'هبوط حاد في الضغط — ممنوع الدمج' },
    { a: ['simvastatin', 'سيمفاستاتين'], b: ['clarithromycin', 'كلاريثرومايسين'], severity: 'high', note_ar: 'خطر انحلال الربيدات — بدّل المضاد الحيوي' },
];
let AiInteractionsController = class AiInteractionsController {
    constructor(conn) {
        this.conn = conn;
    }
    async check(user, body) {
        const u = uid(user);
        const meds = await this.conn.collection('healthmedications')
            .find({ account_id: u, active: { $ne: false } }).toArray();
        const current = meds.map((m) => String(m.name || '').toLowerCase());
        const incoming = (body?.drugs || (body?.drug ? [body.drug] : [])).map((d) => String(d).toLowerCase());
        const all = [...new Set([...current, ...incoming])];
        const hits = [];
        for (const rule of INTERACTION_RULES) {
            const hasA = all.some((d) => rule.a.some((k) => d.includes(k)));
            const hasB = all.some((d) => rule.b.some((k) => d.includes(k)));
            if (hasA && hasB)
                hits.push({ severity: rule.severity, note_ar: rule.note_ar });
        }
        return { checked: all.length, interactions: hits, safe: hits.filter((h) => h.severity === 'high').length === 0 };
    }
};
__decorate([
    (0, common_1.Post)('drug-interactions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiInteractionsController.prototype, "check", null);
AiInteractionsController = __decorate([
    (0, common_1.Controller)('ai'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AiInteractionsController);
let ConsultationsCompatController = class ConsultationsCompatController {
    constructor(conn) {
        this.conn = conn;
    }
    async ownedAppointment(id, u) {
        const b = await this.conn.collection('appointments').findOne(byStringOrObjectId(id));
        if (!b)
            throw new common_1.NotFoundException('الاستشارة غير موجودة');
        const owner = b.patient_id || b.user_id;
        if (owner && String(owner) !== String(u))
            throw new common_1.ForbiddenException('لا تملك هذه الاستشارة');
        return b;
    }
    async detail(id, user) {
        const u = uid(user);
        const b = await this.ownedAppointment(id, u);
        const pid = b.provider_id || b.doctor_id;
        const profile = pid
            ? await this.conn.collection('provider_profiles').findOne({
                $or: [{ id: pid }, { user_id: pid }, { account_id: pid }],
            })
            : null;
        return {
            id: b.id || String(b._id), status: b.status, kind: b.kind || 'consultation',
            scheduled_at: b.scheduled_at || b.starts_at, price: b.price, notes: b.notes,
            provider: profile ? { id: profile.id || String(profile._id), name: profile.name, specialty: profile.specialty } : null,
            consultation_id: b.id || String(b._id),
        };
    }
    async messages(id, user) {
        const u = uid(user);
        const b = await this.ownedAppointment(id, u);
        const key = b.id || String(b._id);
        const rows = await this.conn.collection('consultation_messages')
            .find({ consultation_id: key }).sort({ createdAt: 1 }).limit(300).toArray();
        return rows.map((r) => ({
            id: String(r._id), body: r.body, sender: String(r.sender_id) === String(u) ? 'me' : 'other',
            created_at: r.createdAt,
        }));
    }
    async sendMessage(id, user, body) {
        const u = uid(user);
        const b = await this.ownedAppointment(id, u);
        const text = String(body?.body || '').trim();
        if (!text)
            throw new common_1.BadRequestException('نص الرسالة مطلوب');
        const ins = await this.conn.collection('consultation_messages').insertOne({
            consultation_id: b.id || String(b._id), sender_id: u, body: text, createdAt: now(),
        });
        return { ok: true, id: String(ins.insertedId) };
    }
};
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConsultationsCompatController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConsultationsCompatController.prototype, "messages", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ConsultationsCompatController.prototype, "sendMessage", null);
ConsultationsCompatController = __decorate([
    (0, common_1.Controller)('consultations'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ConsultationsCompatController);
async function facilityIdOf(conn, u) {
    const account = await conn.collection('provider_accounts')
        .findOne({ $or: [{ id: u }, { user_id: u }, { _id: u }] });
    return account?.facility_id || account?.id || u;
}
let FacilityInboxController = class FacilityInboxController {
    constructor(conn) {
        this.conn = conn;
    }
    async inbox(user) {
        const fid = await facilityIdOf(this.conn, uid(user));
        const rows = await this.conn.collection('facilityinbox')
            .find({ facility_id: fid }).sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((r) => ({
            id: String(r._id), kind: r.kind, title: r.title, body: r.body,
            read: !!r.read, created_at: r.createdAt,
        }));
    }
    async markRead(id) {
        await this.conn.collection('facilityinbox')
            .updateOne(byStringOrObjectId(id), { $set: { read: true } });
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)('inbox'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FacilityInboxController.prototype, "inbox", null);
__decorate([
    (0, common_1.Post)('inbox/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FacilityInboxController.prototype, "markRead", null);
FacilityInboxController = __decorate([
    (0, common_1.Controller)('facility'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], FacilityInboxController);
const NURSING_ACTIVE_STATES = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'];
let NursingCompatController = class NursingCompatController {
    constructor(conn) {
        this.conn = conn;
    }
    async activeJobs(user) {
        const u = uid(user);
        const rows = await this.conn.collection('homecarebookings')
            .find({
            $or: [{ provider_id: u }, { nurse_id: u }, { provider_account_id: u }],
            $and: [{ $or: [{ state: { $in: NURSING_ACTIVE_STATES } }, { status: { $in: NURSING_ACTIVE_STATES } }] }],
        })
            .sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((b) => ({
            id: b.id || String(b._id), state: b.state || b.status,
            patient_id: b.patient_id, address: b.address, scheduled_at: b.scheduled_at,
            service: b.service_name || b.service_id, timers: b.timers || {},
        }));
    }
    async addNoteToActive(user, body) {
        const u = uid(user);
        const b = await this.conn.collection('homecarebookings')
            .find({
            $or: [{ provider_id: u }, { nurse_id: u }, { provider_account_id: u }],
            $and: [{ $or: [{ state: { $in: ['ARRIVED', 'IN_PROGRESS', 'arrived', 'in_progress'] } }, { status: { $in: ['ARRIVED', 'IN_PROGRESS', 'arrived', 'in_progress'] } }] }],
        })
            .sort({ updatedAt: -1 }).limit(1).next();
        if (!b)
            throw new common_1.NotFoundException('لا توجد زيارة نشطة لإرفاق الملاحظة بها');
        const vitals = body?.vitals && typeof body.vitals === 'object' ? body.vitals : {};
        const note = String(body?.note || '').trim();
        if (!note && !Object.keys(vitals).length)
            throw new common_1.BadRequestException('الملاحظة أو العلامات الحيوية مطلوبة');
        const ins = await this.conn.collection('nursingvisitreports').insertOne({
            booking_id: b.id || String(b._id), patient_id: b.patient_id, nurse_id: u,
            vitals, note, createdAt: now(),
        });
        await this.conn.collection('homecarebookings').updateOne({ _id: b._id }, { $set: { latest_vitals: vitals, updatedAt: now() } });
        return { ok: true, id: String(ins.insertedId), booking_id: b.id || String(b._id) };
    }
    async addNote(id, user, body) {
        const u = uid(user);
        const text = String(body?.note || body?.body || '').trim();
        if (!text)
            throw new common_1.BadRequestException('نص الملاحظة مطلوب');
        const b = await this.conn.collection('homecarebookings').findOne(byStringOrObjectId(id));
        if (!b)
            throw new common_1.NotFoundException('الطلب غير موجود');
        const assigned = [b.provider_id, b.nurse_id, b.provider_account_id].filter(Boolean).map(String);
        if (assigned.length && !assigned.includes(String(u)))
            throw new common_1.ForbiddenException('الطلب ليس مسنداً إليك');
        const ins = await this.conn.collection('nursingvisitreports').insertOne({
            booking_id: b.id || String(b._id), patient_id: b.patient_id, nurse_id: u,
            note: text, createdAt: now(),
        });
        await this.conn.collection('homecarebookings').updateOne(byStringOrObjectId(id), { $set: { updatedAt: now() } });
        return { ok: true, id: String(ins.insertedId) };
    }
    async verifyGps(user, body) {
        const u = uid(user);
        const lat = Number(body?.lat), lng = Number(body?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng))
            throw new common_1.BadRequestException('إحداثيات غير صالحة');
        const nurse = await this.conn.collection('nurse_providers')
            .findOne({ $or: [{ nurse_id: u }, { provider_id: u }, { account_id: u }, { user_id: u }] });
        const center = nurse?.base_location || nurse?.geo || null;
        const radius = Number(nurse?.coverage_radius_km || 0);
        if (!center || !radius || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) {
            return { covered: true, reason: 'no_geofence' };
        }
        const dist = haversineKm(Number(center.lat), Number(center.lng), lat, lng);
        return { covered: dist <= radius, distance_km: Math.round(dist * 100) / 100, radius_km: radius };
    }
};
__decorate([
    (0, common_1.Get)('jobs/active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NursingCompatController.prototype, "activeJobs", null);
__decorate([
    (0, common_1.Post)('notes'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NursingCompatController.prototype, "addNoteToActive", null);
__decorate([
    (0, common_1.Post)('jobs/:id/notes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NursingCompatController.prototype, "addNote", null);
__decorate([
    (0, common_1.Post)('coverage/verify-gps'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NursingCompatController.prototype, "verifyGps", null);
NursingCompatController = __decorate([
    (0, common_1.Controller)('nursing'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], NursingCompatController);
let PharmacyCompatController = class PharmacyCompatController {
    constructor(conn) {
        this.conn = conn;
    }
    async products(user, q) {
        const u = uid(user);
        const rows = await this.conn.collection('pharmacy_inventory')
            .find({ $or: [{ pharmacy_id: u }, { account_id: u }, { provider_account_id: u }] })
            .limit(500).toArray();
        const medIds = rows.map((r) => r.medicine_id).filter(Boolean);
        const meds = medIds.length
            ? await this.conn.collection('medicines_master').find({ id: { $in: medIds } }).toArray()
            : [];
        const byId = new Map(meds.map((m) => [m.id, m]));
        let items = rows.map((r) => {
            const m = byId.get(r.medicine_id) || {};
            return {
                id: r.id || String(r._id), medicine_id: r.medicine_id,
                name: m.name_ar || m.name_en || r.name || '',
                price: r.price ?? m.price ?? 0, stock: r.stock ?? r.quantity ?? 0,
                shortage_flagged: !!r.shortage_flagged, active: r.active !== false,
            };
        });
        if (q?.trim()) {
            const needle = q.trim().toLowerCase();
            items = items.filter((i) => String(i.name).toLowerCase().includes(needle));
        }
        return items;
    }
    async reportShortage(user, body) {
        const u = uid(user);
        const name = String(body?.product_name || '').trim();
        if (!name && !body?.medicine_id)
            throw new common_1.BadRequestException('اسم الصنف مطلوب');
        const reportId = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const ins = await this.conn.collection('pharmacy_shortage_reports').insertOne({
            id: reportId,
            pharmacy_id: u, reporter_id: u, reporter_role: 'pharmacy',
            medicine_id: body?.medicine_id || null, medicine_name: name || null, product_name: name || null,
            note: body?.note || null, status: 'pending', createdAt: now(), updatedAt: now(),
        });
        if (body?.medicine_id) {
            await this.conn.collection('pharmacy_inventory').updateMany({ pharmacy_id: u, medicine_id: body.medicine_id }, { $set: { shortage_flagged: true } });
        }
        await this.conn.collection('notifications').insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'admin', title_key: 'بلاغ نقص دواء جديد',
            body_key: `بلاغ نقص من صيدلية: ${name || body?.medicine_id}`,
            type: 'alert', priority: 'high', is_read: false,
            data: { screen: '/admin/shortage-reports', report_id: reportId, medicine_id: body?.medicine_id || null },
            createdAt: now(), updatedAt: now(),
        });
        return { ok: true, id: reportId, status: 'pending' };
    }
};
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PharmacyCompatController.prototype, "products", null);
__decorate([
    (0, common_1.Post)('shortages/report'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PharmacyCompatController.prototype, "reportShortage", null);
PharmacyCompatController = __decorate([
    (0, common_1.Controller)('pharmacy'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], PharmacyCompatController);
let ProviderDeltasMineController = class ProviderDeltasMineController {
    constructor(conn) {
        this.conn = conn;
    }
    async mine(user) {
        const u = uid(user);
        const rows = await this.conn.collection('provider_deltas')
            .find({ $or: [{ account_id: u }, { provider_account_id: u }, { user_id: u }, { provider_id: u }] })
            .sort({ createdAt: -1 }).limit(50).toArray();
        return rows.map((d) => ({
            id: String(d._id), kind: d.kind || d.type, status: d.status,
            summary: d.summary || d.title, created_at: d.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderDeltasMineController.prototype, "mine", null);
ProviderDeltasMineController = __decorate([
    (0, common_1.Controller)('provider-deltas'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderDeltasMineController);
let CapabilitiesCatalogController = class CapabilitiesCatalogController {
    constructor(conn) {
        this.conn = conn;
    }
    async labServices() {
        const rows = await this.conn.collection('labservices').find({ active: { $ne: false } }).limit(300).toArray();
        return rows.map((s) => ({
            id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
            price: s.price, category: s.category, prep: s.prep_instructions || s.prep || null,
        }));
    }
    async radiologyServices() {
        const rows = await this.conn.collection('radiologyservices').find({ active: { $ne: false } }).limit(300).toArray();
        return rows.map((s) => ({
            id: s.id || String(s._id), name_ar: s.name_ar, name_en: s.name_en,
            price: s.price, category: s.category, modality: s.modality || null,
        }));
    }
};
__decorate([
    (0, common_1.Get)('lab-services'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CapabilitiesCatalogController.prototype, "labServices", null);
__decorate([
    (0, common_1.Get)('radiology-services'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CapabilitiesCatalogController.prototype, "radiologyServices", null);
CapabilitiesCatalogController = __decorate([
    (0, common_1.Controller)('provider/capabilities'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], CapabilitiesCatalogController);
let ProviderFacilityController = class ProviderFacilityController {
    constructor(conn) {
        this.conn = conn;
    }
    async staffIds(fid) {
        const rows = await this.conn.collection('provider_accounts')
            .find({ facility_id: fid }).project({ id: 1, user_id: 1 }).toArray();
        return rows.flatMap((r) => [r.id, r.user_id].filter(Boolean).map(String));
    }
    async auditLogs(user, limit = '100') {
        const fid = await facilityIdOf(this.conn, uid(user));
        const rows = await this.conn.collection('facility_audit_logs')
            .find({ facility_id: fid }).sort({ createdAt: -1 })
            .limit(Math.min(+limit || 100, 300)).toArray();
        return rows.map((r) => ({
            id: String(r._id), actor: r.actor_id, action: r.action, target: r.target,
            meta: r.meta || {}, created_at: r.createdAt,
        }));
    }
    async calendar(user, days = '30') {
        const fid = await facilityIdOf(this.conn, uid(user));
        const ids = await this.staffIds(fid);
        const horizon = new Date(Date.now() + Math.min(+days || 30, 90) * 86400000);
        const rows = await this.conn.collection('appointments')
            .find({
            $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
            scheduled_at: { $lte: horizon },
        })
            .sort({ scheduled_at: 1 }).limit(300).toArray();
        return rows.map((a) => ({
            id: a.id || String(a._id), patient_id: a.patient_id, provider_id: a.provider_id || a.doctor_id,
            scheduled_at: a.scheduled_at, status: a.status, kind: a.kind || 'consultation',
        }));
    }
    async activePatients(user) {
        const fid = await facilityIdOf(this.conn, uid(user));
        const ids = await this.staffIds(fid);
        const patientIds = await this.conn.collection('appointments').distinct('patient_id', {
            $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
            status: { $nin: ['CANCELLED', 'cancelled', 'COMPLETED', 'completed'] },
        });
        if (!patientIds.length)
            return [];
        const users = await this.conn.collection('users')
            .find({ $or: [{ id: { $in: patientIds } }, { _id: { $in: patientIds } }] })
            .project({ id: 1, full_name: 1, phone: 1, email: 1 }).limit(300).toArray();
        return users.map((x) => ({ id: x.id || String(x._id), name: x.full_name, phone: x.phone, email: x.email }));
    }
    async subaccounts(user) {
        const fid = await facilityIdOf(this.conn, uid(user));
        const rows = await this.conn.collection('provider_accounts')
            .find({ facility_id: fid })
            .project({ id: 1, email: 1, role: 1, ptype: 1, status: 1, full_name: 1, createdAt: 1 })
            .limit(300).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), email: r.email, name: r.full_name,
            role: r.role || r.ptype, status: r.status, created_at: r.createdAt,
        }));
    }
    async shifts(user, days = '14') {
        const fid = await facilityIdOf(this.conn, uid(user));
        const horizon = new Date(Date.now() + Math.min(+days || 14, 60) * 86400000);
        const rows = await this.conn.collection('shifts')
            .find({ facility_id: fid, date: { $lte: horizon } })
            .sort({ date: 1 }).limit(300).toArray();
        return rows.map((s) => ({
            id: s.id || String(s._id), staff_id: s.staff_id, staff_name: s.staff_name,
            role: s.role, date: s.date, start: s.start, end: s.end, status: s.status || 'scheduled',
        }));
    }
};
__decorate([
    (0, common_1.Get)('audit-logs'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderFacilityController.prototype, "auditLogs", null);
__decorate([
    (0, common_1.Get)('calendar'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderFacilityController.prototype, "calendar", null);
__decorate([
    (0, common_1.Get)('patients/active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderFacilityController.prototype, "activePatients", null);
__decorate([
    (0, common_1.Get)('subaccounts'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderFacilityController.prototype, "subaccounts", null);
__decorate([
    (0, common_1.Get)('shifts'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderFacilityController.prototype, "shifts", null);
ProviderFacilityController = __decorate([
    (0, common_1.Controller)('provider/facility'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderFacilityController);
let B2BVoiceController = class B2BVoiceController {
    constructor(conn) {
        this.conn = conn;
    }
    async voiceToOrder(user, body) {
        const text = String(body?.text || '').trim();
        if (!text)
            throw new common_1.BadRequestException('نص الطلب الصوتي مطلوب');
        const segments = text.split(/[,،;\n]|\s+و\s+/).map((s) => s.trim()).filter(Boolean);
        const items = [];
        const unmatched = [];
        for (const seg of segments.slice(0, 30)) {
            const m = seg.match(/^(\d{1,4})\s*[x×]?\s*(.+)$/) || seg.match(/^(.+?)\s*(\d{1,4})$/);
            const qty = m ? Math.min(parseInt(m[1].length <= 4 && /^\d/.test(m[0]) ? m[1] : m[2], 10) || 1, 999) : 1;
            const name = (m ? (/^\d/.test(m[0]) ? m[2] : m[1]) : seg).trim();
            if (!name)
                continue;
            const rx = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const product = await this.conn.collection('medicines_master')
                .findOne({ $or: [{ name_ar: rx }, { name_en: rx }] });
            if (product) {
                items.push({
                    medicine_id: product.id, name: product.name_ar || product.name_en,
                    qty, unit_price: product.price ?? 0, matched: true,
                });
            }
            else {
                unmatched.push(name);
                items.push({ name, qty, matched: false });
            }
        }
        return {
            pharmacy_id: uid(user), items, unmatched,
            total_estimate: items.reduce((s, i) => s + (i.matched ? i.qty * (i.unit_price || 0) : 0), 0),
        };
    }
};
__decorate([
    (0, common_1.Post)('voice-to-order'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], B2BVoiceController.prototype, "voiceToOrder", null);
B2BVoiceController = __decorate([
    (0, common_1.Controller)('provider/pharmacy/b2b'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], B2BVoiceController);
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
let MentalHealthCompatController = class MentalHealthCompatController {
    questions(type = 'phq9') {
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
};
__decorate([
    (0, common_1.Get)('assessment-questions'),
    __param(0, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MentalHealthCompatController.prototype, "questions", null);
MentalHealthCompatController = __decorate([
    (0, common_1.Controller)('mental-health')
], MentalHealthCompatController);
let ProviderDrugIndexController = class ProviderDrugIndexController {
    constructor(conn) {
        this.conn = conn;
    }
    get col() { return this.conn.collection('medicines_master'); }
    card(m) {
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
    async list(search, category, limit = '50') {
        const q = { is_deleted: { $ne: true } };
        if (search)
            q.$or = [
                { name_ar: { $regex: search, $options: 'i' } },
                { name_en: { $regex: search, $options: 'i' } },
                { active_ingredient: { $regex: search, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
            ];
        if (category && category !== 'all') {
            const map = { medications: 'أدوية ومكملات', skincare: 'العناية بالبشرة', vitamins: 'أدوية ومكملات' };
            if (category === 'vitamins') {
                q.sub_category = { $regex: 'فيتامين', $options: 'i' };
            }
            else {
                q.category = map[category] || category;
            }
        }
        const rows = await this.col.find(q, { projection: { _id: 0, translations: 0, more_info_ar: 0, more_info_en: 0 } })
            .sort({ usage_count: -1, name_ar: 1 }).limit(Math.min(parseInt(limit, 10) || 50, 100)).toArray();
        return { data: rows.map((m) => this.card(m)), total: rows.length };
    }
    async categories() {
        const rows = await this.col.aggregate([
            { $match: { is_deleted: { $ne: true }, category: { $nin: [null, ''] } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 30 },
        ]).toArray();
        return { data: rows.map((r) => ({ key: r._id, count: r.count })) };
    }
    async one(id) {
        const m = await this.col.findOne({ id, is_deleted: { $ne: true } }, { projection: { _id: 0 } });
        if (!m)
            return { error: 'not_found' };
        const alternatives = m.active_ingredient
            ? await this.col.find({ active_ingredient: m.active_ingredient, id: { $ne: id }, is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, image: 1 } }).limit(8).toArray()
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
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderDrugIndexController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProviderDrugIndexController.prototype, "categories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderDrugIndexController.prototype, "one", null);
ProviderDrugIndexController = __decorate([
    (0, common_1.Controller)('drugs'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderDrugIndexController);
let ProviderDashboardController = class ProviderDashboardController {
    constructor(conn) {
        this.conn = conn;
    }
    async dashboard(user) {
        const uid = user.id;
        const role = user.role;
        const profile = await this.conn.collection('provider_profiles').findOne({ $or: [{ user_id: uid }, { account_id: uid }] }, { projection: { _id: 0 } });
        const jobQueries = {
            pharmacy: { col: 'orders', idField: 'pharmacy_id', dateField: 'createdAt' },
            doctor: { col: 'appointments', idField: 'provider_id', dateField: 'scheduled_time' },
            lab: { col: 'labbookings', idField: 'provider_account_id', dateField: 'createdAt' },
            radiology: { col: 'radiologybookings', idField: 'provider_account_id', dateField: 'createdAt' },
            nurse: { col: 'homecarebookings', idField: 'assigned_provider_id', dateField: 'createdAt' },
            driver: { col: 'orders', idField: 'driver_id', dateField: 'createdAt' },
        };
        const q = jobQueries[role] || jobQueries.pharmacy;
        const col = this.conn.collection(q.col);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const base = { [q.idField]: uid };
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
        let wallet = { balance: 0, pending_payout: 0 };
        try {
            const w = await this.conn.collection('platformledgerentries').aggregate([
                { $match: { provider_account_id: uid } },
                { $group: { _id: null, earned: { $sum: { $cond: [{ $eq: ['$type', 'provider_earning'] }, '$amount', 0] } }, paid: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$state', 'pending'] }, '$amount', 0] } } } },
            ]).toArray();
            if (w[0])
                wallet = { balance: Math.max(0, (w[0].earned || 0) - (w[0].paid || 0)), pending_payout: w[0].pending || 0 };
        }
        catch { }
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
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderDashboardController.prototype, "dashboard", null);
ProviderDashboardController = __decorate([
    (0, common_1.Controller)('provider/dashboard'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ProviderDashboardController);
let CompatModule = class CompatModule {
};
exports.CompatModule = CompatModule;
exports.CompatModule = CompatModule = __decorate([
    (0, common_1.Module)({
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
        ],
    })
], CompatModule);
//# sourceMappingURL=compat.module.js.map