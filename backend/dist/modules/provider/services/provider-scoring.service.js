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
exports.ProviderScoringService = void 0;
const common_1 = require("@nestjs/common");
const capabilities_schema_1 = require("../schemas/capabilities.schema");
const requests_schema_1 = require("../schemas/requests.schema");
const providerscoresnapshot_repository_1 = require("./repositories/providerscoresnapshot.repository");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const providerassignmentattempt_repository_1 = require("./repositories/providerassignmentattempt.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
let ProviderScoringService = class ProviderScoringService {
    constructor(scores, requests, attempts) {
        this.scores = scores;
        this.requests = requests;
        this.attempts = attempts;
    }
    async recompute(provider_account_id) {
        const base = { provider_account_id };
        const [total, accepted, rejected, completed, cancelled, atts] = await Promise.all([
            this.requests.countDocuments(base),
            this.requests.countDocuments({ ...base, status: { $in: [requests_schema_1.ProviderRequestStatus.ACCEPTED, requests_schema_1.ProviderRequestStatus.IN_PROGRESS, requests_schema_1.ProviderRequestStatus.COMPLETED] } }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.REJECTED }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.COMPLETED }),
            this.requests.countDocuments({ ...base, status: requests_schema_1.ProviderRequestStatus.CANCELLED }),
            this.attempts.find({ ...base, responded_at: { $exists: true } }, { sent_at: 1, responded_at: 1, status: 1 }).lean(),
        ]);
        const decided = accepted + rejected;
        const acceptance_rate = decided > 0 ? accepted / decided : 0;
        const completion_rate = accepted > 0 ? completed / accepted : 0;
        let totalResponseMs = 0;
        let respCount = 0;
        for (const a of atts) {
            if (a.responded_at && a.sent_at) {
                totalResponseMs += new Date(a.responded_at).getTime() - new Date(a.sent_at).getTime();
                respCount++;
            }
        }
        const avg_response_seconds = respCount > 0 ? Math.round(totalResponseMs / respCount / 1000) : 0;
        const responseBonus = avg_response_seconds === 0 ? 0 : Math.max(0, 1 - Math.min(avg_response_seconds, 600) / 600);
        const reliability_score = Math.round(acceptance_rate * 50 + completion_rate * 30 + responseBonus * 20);
        const upd = await this.scores.findOneAndUpdate({ provider_account_id }, {
            provider_account_id,
            total_requests: total,
            total_accepted: accepted,
            total_rejected: rejected,
            total_completed: completed,
            total_cancelled: cancelled,
            acceptance_rate,
            completion_rate,
            avg_response_seconds,
            reliability_score,
            last_calculated_at: new Date(),
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return upd.toObject();
    }
    async getMy(user) {
        assertProvider(user);
        let s = await this.scores.findOne({ provider_account_id: user.id }).lean();
        if (!s)
            s = (await this.recompute(user.id));
        return s;
    }
    async getForIds(ids) {
        const found = await this.scores.find({ provider_account_id: { $in: ids } }).lean();
        const map = {};
        for (const s of found)
            map[s.provider_account_id] = s;
        return map;
    }
    async onLifecycleEvent(provider_account_id) {
        try {
            await this.recompute(provider_account_id);
        }
        catch { }
    }
    async markAttemptResponse(request_id, provider_account_id, status, reason) {
        const a = await this.attempts.findOne({ request_id, provider_account_id, status: capabilities_schema_1.AssignmentAttemptStatus.PENDING }).sort({ createdAt: -1 });
        if (!a)
            return;
        a.status = status;
        a.responded_at = new Date();
        if (reason)
            a.rejection_reason = reason;
        await a.save();
    }
};
exports.ProviderScoringService = ProviderScoringService;
exports.ProviderScoringService = ProviderScoringService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderScoreSnapshotRepository')),
    __param(1, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(2, (0, common_1.Inject)('ProviderAssignmentAttemptRepository')),
    __metadata("design:paramtypes", [providerscoresnapshot_repository_1.ProviderScoreSnapshotRepository,
        providerrequest_repository_1.ProviderRequestRepository,
        providerassignmentattempt_repository_1.ProviderAssignmentAttemptRepository])
], ProviderScoringService);
//# sourceMappingURL=provider-scoring.service.js.map