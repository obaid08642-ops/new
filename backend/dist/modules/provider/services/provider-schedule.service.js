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
exports.ProviderScheduleService = void 0;
const common_1 = require("@nestjs/common");
const requests_schema_1 = require("../schemas/requests.schema");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
let ProviderScheduleService = class ProviderScheduleService {
    constructor(requests) {
        this.requests = requests;
    }
    async view(user, q) {
        assertProvider(user);
        const mode = q.mode === 'weekly' ? 'weekly' : 'daily';
        const baseDate = q.from ? new Date(q.from) : new Date();
        const start = startOfDay(baseDate);
        const end = mode === 'weekly'
            ? endOfDay(new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000))
            : endOfDay(baseDate);
        const items = await this.requests.find({
            provider_account_id: user.id,
            status: { $in: [requests_schema_1.ProviderRequestStatus.ACCEPTED, requests_schema_1.ProviderRequestStatus.IN_PROGRESS, requests_schema_1.ProviderRequestStatus.COMPLETED] },
            scheduled_at: { $gte: start, $lte: end },
        }).sort({ scheduled_at: 1 }).lean();
        const days = {};
        for (const r of items) {
            if (!r.scheduled_at)
                continue;
            const key = new Date(r.scheduled_at).toISOString().slice(0, 10);
            if (!days[key])
                days[key] = [];
            days[key].push({
                id: r.id,
                type: r.type,
                status: r.status,
                scheduled_at: r.scheduled_at,
                scheduled_slot_minutes: r.scheduled_slot_minutes || 30,
                patient_name: r.patient?.name,
                summary_ar: r.summary_ar,
                summary_en: r.summary_en,
            });
        }
        return {
            mode,
            from: start,
            to: end,
            count: items.length,
            days,
        };
    }
};
exports.ProviderScheduleService = ProviderScheduleService;
exports.ProviderScheduleService = ProviderScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderRequestRepository')),
    __metadata("design:paramtypes", [providerrequest_repository_1.ProviderRequestRepository])
], ProviderScheduleService);
//# sourceMappingURL=provider-schedule.service.js.map