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
exports.AnalyticsModule = exports.AdminAnalyticsController = exports.AdminAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let AdminAnalyticsService = class AdminAnalyticsService {
    constructor(conn) {
        this.conn = conn;
    }
    col(name) { return this.conn.collection(name); }
    async topSearched(limit = 20) {
        return this.col('search_queries').aggregate([
            { $group: { _id: '$term_lc', searches: { $sum: 1 }, avg_results: { $avg: '$results_count' }, last: { $max: '$createdAt' } } },
            { $sort: { searches: -1 } },
            { $limit: limit },
            { $project: { _id: 0, term: '$_id', searches: 1, avg_results: { $round: ['$avg_results', 1] }, last: 1 } },
        ]).toArray();
    }
    async topOrderedMedicines(limit = 20) {
        return this.col('orders').aggregate([
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
            { $group: { _id: { $ifNull: ['$items.name_ar', '$items.name'] }, orders: { $sum: 1 }, qty: { $sum: { $ifNull: ['$items.qty', 1] } }, revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.qty', 1] }] } } } },
            { $sort: { qty: -1 } },
            { $limit: limit },
            { $project: { _id: 0, medicine: '$_id', orders: 1, qty: 1, revenue: { $round: ['$revenue', 2] } } },
        ]).toArray();
    }
    async topDoctors(limit = 20) {
        return this.col('appointments').aggregate([
            { $group: { _id: { $ifNull: ['$doctor_name', '$provider_id'] }, appointments: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'complete', 'completed']] }, 1, 0] } } } },
            { $sort: { appointments: -1 } },
            { $limit: limit },
            { $project: { _id: 0, doctor: '$_id', appointments: 1, completed: 1 } },
        ]).toArray();
    }
    async topPharmacies(limit = 20) {
        return this.col('orders').aggregate([
            { $group: { _id: { $ifNull: ['$pharmacy_id', '$pharmacy_name'] }, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total', { $ifNull: ['$totals.total', 0] }] } } } },
            { $sort: { orders: -1 } },
            { $limit: limit },
            { $project: { _id: 0, pharmacy: '$_id', orders: 1, revenue: { $round: ['$revenue', 2] } } },
        ]).toArray();
    }
    async topServices(limit = 20) {
        return this.col('appointments').aggregate([
            { $group: { _id: { $ifNull: ['$type', '$service_type', 'consultation'] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
            { $project: { _id: 0, service: '$_id', count: 1 } },
        ]).toArray();
    }
    async overview() {
        const now = Date.now();
        const day = 24 * 3600 * 1000;
        const [users, orders, appointments, carts] = await Promise.all([
            this.col('users').countDocuments({}),
            this.col('orders').countDocuments({}),
            this.col('appointments').countDocuments({}),
            this.col('carts').countDocuments({}),
        ]);
        const completedOrders = await this.col('orders').countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED', 'delivered', 'completed'] } });
        const cancelledOrders = await this.col('orders').countDocuments({ status: { $in: ['CANCELLED', 'cancelled'] } });
        const cancelledAppts = await this.col('appointments').countDocuments({ status: { $in: ['CANCELLED', 'cancelled', 'NO_SHOW'] } });
        const activitySince = async (ms) => {
            const res = await this.col('orders').aggregate([
                { $match: { createdAt: { $gte: new Date(now - ms) } } },
                { $group: { _id: '$patient_id' } },
                { $unionWith: { coll: 'appointments', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$patient_id' } }] } },
                { $unionWith: { coll: 'pushengagements', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$user_id' } }] } },
                { $unionWith: { coll: 'chatmessages', pipeline: [{ $match: { createdAt: { $gte: new Date(now - ms) } } }, { $group: { _id: '$sender_id' } }] } },
                { $group: { _id: null, users: { $addToSet: '$_id' } } },
            ]).toArray();
            return res[0]?.users?.filter(Boolean).length || 0;
        };
        const [dau, wau, mau] = await Promise.all([activitySince(day), activitySince(7 * day), activitySince(30 * day)]);
        const retentionAgg = await this.col('orders').aggregate([
            { $match: { createdAt: { $gte: new Date(now - 28 * day) } } },
            { $group: { _id: { u: '$patient_id', week: { $week: '$createdAt' } } } },
            { $group: { _id: '$_id.u', weeks: { $sum: 1 } } },
            { $match: { weeks: { $gte: 2 } } },
            { $count: 'retained' },
        ]).toArray();
        const retained = retentionAgg[0]?.retained || 0;
        return {
            totals: { users, orders, appointments, carts },
            conversion_rate: carts > 0 ? +(completedOrders / carts * 100).toFixed(1) : null,
            order_cancellation_rate: orders > 0 ? +(cancelledOrders / orders * 100).toFixed(1) : null,
            appointment_cancellation_rate: appointments > 0 ? +(cancelledAppts / appointments * 100).toFixed(1) : null,
            active_users: { dau, wau, mau },
            retention_4w: { retained_users: retained, note: 'users with activity in ≥2 of last 4 weeks' },
        };
    }
};
exports.AdminAnalyticsService = AdminAnalyticsService;
exports.AdminAnalyticsService = AdminAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AdminAnalyticsService);
let AdminAnalyticsController = class AdminAnalyticsController {
    constructor(svc) {
        this.svc = svc;
    }
    overview() { return this.svc.overview(); }
    topSearched(limit) { return this.svc.topSearched(parseInt(limit || '20')); }
    topMedicines(limit) { return this.svc.topOrderedMedicines(parseInt(limit || '20')); }
    topDoctors(limit) { return this.svc.topDoctors(parseInt(limit || '20')); }
    topPharmacies(limit) { return this.svc.topPharmacies(parseInt(limit || '20')); }
    topServices(limit) { return this.svc.topServices(parseInt(limit || '20')); }
};
exports.AdminAnalyticsController = AdminAnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('top-searched'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "topSearched", null);
__decorate([
    (0, common_1.Get)('top-medicines'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "topMedicines", null);
__decorate([
    (0, common_1.Get)('top-doctors'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "topDoctors", null);
__decorate([
    (0, common_1.Get)('top-pharmacies'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "topPharmacies", null);
__decorate([
    (0, common_1.Get)('top-services'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "topServices", null);
exports.AdminAnalyticsController = AdminAnalyticsController = __decorate([
    (0, common_1.Controller)('admin/analytics'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminAnalyticsService])
], AdminAnalyticsController);
let AnalyticsModule = class AnalyticsModule {
};
exports.AnalyticsModule = AnalyticsModule;
exports.AnalyticsModule = AnalyticsModule = __decorate([
    (0, common_1.Module)({
        controllers: [AdminAnalyticsController],
        providers: [AdminAnalyticsService],
    })
], AnalyticsModule);
//# sourceMappingURL=analytics.module.js.map