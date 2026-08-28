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
exports.ProviderDashboardService = void 0;
const common_1 = require("@nestjs/common");
const requests_schema_1 = require("../schemas/requests.schema");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
let ProviderDashboardService = class ProviderDashboardService {
    constructor(requests, avails, accounts, profiles) {
        this.requests = requests;
        this.avails = avails;
        this.accounts = accounts;
        this.profiles = profiles;
    }
    async stats(user) {
        assertProvider(user);
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const base = { account_id: user.id };
        const [today_total, pending, completed_today, today_revenue_agg, accepted_all, in_progress] = await Promise.all([
            this.requests.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.PENDING }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.COMPLETED, completed_at: { $gte: todayStart, $lte: todayEnd } }),
            this.requests.aggregate([
                { $match: { account_id: user.id, status: requests_schema_1.ProviderRequestStatus.COMPLETED, completed_at: { $gte: todayStart, $lte: todayEnd } } },
                { $group: { _id: null, total: { $sum: '$amount_total' } } },
            ]),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.ACCEPTED }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.IN_PROGRESS }),
        ]);
        const today_revenue = (today_revenue_agg[0]?.total) || 0;
        return {
            today_requests: today_total,
            pending_requests: pending,
            completed_today,
            in_progress,
            accepted_total: accepted_all,
            today_revenue,
            currency: 'SAR',
        };
    }
    async recentRequests(user, limit = 3) {
        assertProvider(user);
        const items = await this.requests.find({ account_id: user.id })
            .sort({ createdAt: -1 }).limit(limit).lean();
        return { items };
    }
    async getAvailability(user) {
        assertProvider(user);
        let a = await this.avails.findOne({ provider_account_id: user.id });
        if (!a) {
            a = await this.avails.create({ provider_account_id: user.id, status: requests_schema_1.ProviderAvailabilityStatus.OFFLINE });
        }
        return { status: a.status, last_online_at: a.last_online_at, last_offline_at: a.last_offline_at, note: a.note };
    }
    async setAvailability(user, body) {
        assertProvider(user);
        if (!Object.values(requests_schema_1.ProviderAvailabilityStatus).includes(body.status)) {
            throw new common_1.NotFoundException('invalid availability status');
        }
        const a = await this.avails.findOneAndUpdate({ provider_account_id: user.id }, {
            $set: {
                status: body.status,
                note: body.note,
                ...(body.status === requests_schema_1.ProviderAvailabilityStatus.ONLINE || body.status === requests_schema_1.ProviderAvailabilityStatus.ACCEPTING_ORDERS ? { last_online_at: new Date() } : {}),
                ...(body.status === requests_schema_1.ProviderAvailabilityStatus.OFFLINE ? { last_offline_at: new Date() } : {}),
            },
        }, { upsert: true, new: true });
        return { status: a.status, last_online_at: a.last_online_at, last_offline_at: a.last_offline_at, note: a.note };
    }
    async me(user) {
        assertProvider(user);
        const a = await this.accounts.findOne({ id: user.id });
        if (!a)
            throw new common_1.NotFoundException();
        const p = await this.profiles.findOne({ account_id: a.id });
        const av = await this.getAvailability(user);
        return {
            account: { id: a.id, email: a.email, provider_type: a.provider_type, status: a.status, email_verified: a.email_verified, approved_at: a.approved_at },
            profile: p?.toObject() || null,
            availability: av,
        };
    }
};
exports.ProviderDashboardService = ProviderDashboardService;
exports.ProviderDashboardService = ProviderDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(1, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __param(2, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(3, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __metadata("design:paramtypes", [providerrequest_repository_1.ProviderRequestRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository,
        provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository])
], ProviderDashboardService);
//# sourceMappingURL=provider-dashboard.service.js.map