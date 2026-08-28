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
exports.RatingsModule = exports.RatingsController = exports.RatingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
let RatingsService = class RatingsService {
    constructor(conn) {
        this.conn = conn;
    }
    get ratings() { return this.conn.collection('ratings'); }
    get profiles() { return this.conn.collection('provider_profiles'); }
    async submit(user, body) {
        const { entity_type, entity_id, provider_id, score, comment } = body || {};
        if (!entity_type || !entity_id || !provider_id)
            throw new common_1.BadRequestException('entity_type, entity_id, provider_id required');
        if (!['order', 'appointment', 'lab_booking', 'radiology_booking', 'homecare_booking', 'consultation'].includes(entity_type)) {
            throw new common_1.BadRequestException('unsupported entity_type');
        }
        if (typeof score !== 'number' || score < 1 || score > 5)
            throw new common_1.BadRequestException('score must be 1..5');
        const existing = await this.ratings.findOne({ user_id: user.id, entity_type, entity_id });
        if (existing) {
            await this.ratings.updateOne({ _id: existing._id }, { $set: { score, comment: comment || null, updated_at: new Date() } });
            await this.recompute(provider_id);
            return { ok: true, updated: true, entity_id };
        }
        await this.ratings.insertOne({
            user_id: user.id,
            user_name: user.full_name || null,
            entity_type,
            entity_id,
            provider_id,
            score,
            comment: comment || null,
            status: 'published',
            createdAt: new Date(),
        });
        await this.recompute(provider_id);
        return { ok: true, created: true, entity_id };
    }
    async recompute(providerId) {
        const agg = await this.ratings.aggregate([
            { $match: { provider_id: providerId, status: 'published' } },
            { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
        ]).toArray();
        const avg = agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0;
        const n = agg[0]?.n || 0;
        await this.profiles.updateMany({ $or: [{ user_id: providerId }, { account_id: providerId }] }, { $set: { rating_avg: avg, rating_count: n, rating: avg } });
    }
    async forProvider(providerId, page = 1, limit = 20) {
        const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
        const [rows, total, agg] = await Promise.all([
            this.ratings.find({ provider_id: providerId, status: 'published' }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
            this.ratings.countDocuments({ provider_id: providerId, status: 'published' }),
            this.ratings.aggregate([
                { $match: { provider_id: providerId, status: 'published' } },
                { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
            ]).toArray(),
        ]);
        return {
            data: rows,
            total,
            page,
            total_pages: Math.ceil(total / Math.min(limit, 100)),
            avg: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0,
            count: agg[0]?.n || 0,
        };
    }
    async mine(userId, entityType, entityId) {
        return this.ratings.findOne({ user_id: userId, entity_type: entityType, entity_id: entityId }, { projection: { _id: 0, score: 1, comment: 1, createdAt: 1 } });
    }
};
exports.RatingsService = RatingsService;
exports.RatingsService = RatingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], RatingsService);
let RatingsController = class RatingsController {
    constructor(svc) {
        this.svc = svc;
    }
    submit(user, body) {
        return this.svc.submit(user, body);
    }
    forProvider(id, page, limit) {
        return this.svc.forProvider(id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    mine(user, et, eid) {
        return this.svc.mine(user.id, et, eid);
    }
};
exports.RatingsController = RatingsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RatingsController.prototype, "submit", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('provider/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RatingsController.prototype, "forProvider", null);
__decorate([
    (0, common_1.Get)('mine/:entity_type/:entity_id'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('entity_type')),
    __param(2, (0, common_1.Param)('entity_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RatingsController.prototype, "mine", null);
exports.RatingsController = RatingsController = __decorate([
    (0, common_1.Controller)('ratings'),
    __metadata("design:paramtypes", [RatingsService])
], RatingsController);
let RatingsModule = class RatingsModule {
};
exports.RatingsModule = RatingsModule;
exports.RatingsModule = RatingsModule = __decorate([
    (0, common_1.Module)({
        controllers: [RatingsController],
        providers: [RatingsService],
    })
], RatingsModule);
//# sourceMappingURL=ratings.module.js.map