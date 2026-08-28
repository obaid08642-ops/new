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
exports.AssignmentStrategyService = void 0;
const common_1 = require("@nestjs/common");
const requests_schema_1 = require("../schemas/requests.schema");
const capabilities_schema_1 = require("../schemas/capabilities.schema");
const provider_matching_service_1 = require("./provider-matching.service");
const provider_notifications_service_1 = require("./provider-notifications.service");
const provider_scoring_service_1 = require("./provider-scoring.service");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const providerassignmentattempt_repository_1 = require("./repositories/providerassignmentattempt.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
function assertAdmin(user) {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin'))
        throw new common_1.ForbiddenException('admin only');
    return user;
}
let AssignmentStrategyService = class AssignmentStrategyService {
    constructor(requests, attempts, matching, notifs, scoring) {
        this.requests = requests;
        this.attempts = attempts;
        this.matching = matching;
        this.notifs = notifs;
        this.scoring = scoring;
        this.logger = new common_1.Logger('AssignmentStrategy');
    }
    async createAndDispatch(input) {
        const strategy = input.strategy || capabilities_schema_1.AssignmentStrategy.AUTO_BEST;
        const r = await this.requests.create({
            provider_account_id: null,
            type: input.type,
            status: requests_schema_1.ProviderRequestStatus.PENDING,
            patient: input.patient,
            payload: input.payload,
            summary_ar: input.summary_ar,
            summary_en: input.summary_en,
            amount_total: input.amount_total || 0,
            priority: input.priority,
            scheduled_at: input.scheduled_at,
            patient_location: input.patient_location,
            assignment_state: 'matching',
            assignment_strategy: strategy,
            attempted_provider_ids: [],
            seeded: !!input.seeded,
            timeline: [{ at: new Date(), status: requests_schema_1.ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: 'request created — dispatching' }],
        });
        const dispatch = await this.dispatch(r.id, input.timeout_seconds || 120);
        return { request: (await this.requests.findOne({ id: r.id }).lean()), dispatch };
    }
    async dispatch(request_id, timeout_seconds = 120) {
        const r = await this.requests.findOne({ id: request_id });
        if (!r)
            throw new common_1.NotFoundException('request not found');
        if (r.assignment_state === 'assigned')
            return { ok: false, reason: 'already_assigned', request_id };
        const match = await this.matching.matchForRequest(request_id, 10);
        r.match_breakdown = { ranked_at: new Date(), candidates: match.candidates };
        if (match.candidates.length === 0) {
            r.assignment_state = 'failed';
            r.status = requests_schema_1.ProviderRequestStatus.CANCELLED;
            r.cancelled_at = new Date();
            r.rejection_reason = 'no_eligible_providers';
            r.timeline.push({ at: new Date(), status: requests_schema_1.ProviderRequestStatus.CANCELLED, by_role: 'system', by_user_id: 'system', note: 'no eligible providers' });
            await r.save();
            return { ok: false, reason: 'no_eligible_providers', request_id };
        }
        const strategy = r.assignment_strategy;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + timeout_seconds * 1000);
        if (strategy === capabilities_schema_1.AssignmentStrategy.AUTO_BEST || strategy === capabilities_schema_1.AssignmentStrategy.MANUAL) {
            const top = match.candidates[0];
            r.provider_account_id = top.provider_account_id;
            r.assignment_state = 'assigned';
            r.attempted_provider_ids = [...(r.attempted_provider_ids || []), top.provider_account_id];
            r.assignment_timeout_at = expiresAt;
            r.timeline.push({ at: now, status: requests_schema_1.ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: `auto-assigned to ${top.display_name}` });
            await r.save();
            await this.attempts.create({
                request_id: r.id, provider_account_id: top.provider_account_id, attempt_index: 1,
                strategy, sent_at: now, expires_at: expiresAt, timeout_seconds, score: top.breakdown,
                status: capabilities_schema_1.AssignmentAttemptStatus.PENDING,
            });
            await this.notifs.createSystem(top.provider_account_id, {
                type: 'new_request',
                title_ar: 'طلب جديد تم توجيهه إليك', title_en: 'New request assigned to you',
                body_ar: r.summary_ar, body_en: r.summary_en,
                related_id: r.id, related_type: 'request', icon: 'bell',
            });
            return { ok: true, strategy, assigned_to: top.provider_account_id, expires_at: expiresAt, candidates: match.candidates };
        }
        if (strategy === capabilities_schema_1.AssignmentStrategy.BROADCAST) {
            const top3 = match.candidates.slice(0, 3);
            r.assignment_state = 'broadcasted';
            r.assignment_timeout_at = expiresAt;
            r.attempted_provider_ids = [...(r.attempted_provider_ids || []), ...top3.map((c) => c.provider_account_id)];
            r.timeline.push({ at: now, status: requests_schema_1.ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: `broadcasted to ${top3.length} providers` });
            await r.save();
            for (let i = 0; i < top3.length; i++) {
                const c = top3[i];
                await this.attempts.create({
                    request_id: r.id, provider_account_id: c.provider_account_id, attempt_index: i + 1,
                    strategy, sent_at: now, expires_at: expiresAt, timeout_seconds, score: c.breakdown,
                    status: capabilities_schema_1.AssignmentAttemptStatus.PENDING,
                });
                await this.notifs.createSystem(c.provider_account_id, {
                    type: 'new_request',
                    title_ar: 'فرصة طلب جديد — أول من يقبل',
                    title_en: 'New request available — first to accept',
                    body_ar: r.summary_ar, body_en: r.summary_en,
                    related_id: r.id, related_type: 'request', icon: 'bell',
                });
            }
            return { ok: true, strategy, broadcasted_to: top3.map(c => c.provider_account_id), expires_at: expiresAt, candidates: match.candidates };
        }
        return { ok: false, reason: 'unknown_strategy' };
    }
    async manualAssign(user, request_id, provider_account_id) {
        assertAdmin(user);
        const r = await this.requests.findOne({ id: request_id });
        if (!r)
            throw new common_1.NotFoundException('request not found');
        if (r.assignment_state === 'assigned' && r.status !== requests_schema_1.ProviderRequestStatus.PENDING) {
            throw new common_1.BadRequestException('request already in active assignment');
        }
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 120 * 1000);
        r.provider_account_id = provider_account_id;
        r.assignment_state = 'assigned';
        r.assignment_strategy = capabilities_schema_1.AssignmentStrategy.MANUAL;
        r.assignment_timeout_at = expiresAt;
        r.attempted_provider_ids = Array.from(new Set([...(r.attempted_provider_ids || []), provider_account_id]));
        r.timeline.push({ at: now, status: requests_schema_1.ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: user.id, note: `manual assignment by admin` });
        await r.save();
        await this.attempts.create({
            request_id: r.id, provider_account_id, attempt_index: (r.attempted_provider_ids?.length || 1),
            strategy: capabilities_schema_1.AssignmentStrategy.MANUAL, sent_at: now, expires_at: expiresAt, timeout_seconds: 120,
            status: capabilities_schema_1.AssignmentAttemptStatus.PENDING,
        });
        await this.notifs.createSystem(provider_account_id, {
            type: 'new_request',
            title_ar: 'تعيين إداري — طلب جديد',
            title_en: 'Admin assignment — new request',
            body_ar: r.summary_ar, body_en: r.summary_en,
            related_id: r.id, related_type: 'request', icon: 'bell',
        });
        return r.toObject();
    }
    async onProviderRejected(request_id, provider_account_id, reason) {
        const r = await this.requests.findOne({ id: request_id });
        if (!r)
            return;
        await this.scoring.markAttemptResponse(request_id, provider_account_id, capabilities_schema_1.AssignmentAttemptStatus.REJECTED, reason);
        if (r.assignment_strategy === capabilities_schema_1.AssignmentStrategy.MANUAL)
            return;
        if (r.attempted_provider_ids && r.attempted_provider_ids.length >= 5) {
            r.assignment_state = 'failed';
            r.rejection_reason = 'max_attempts_reached';
            await r.save();
            return;
        }
        r.provider_account_id = null;
        r.assignment_state = 'matching';
        r.status = requests_schema_1.ProviderRequestStatus.PENDING;
        await r.save();
        await this.dispatch(request_id, 120);
    }
    async onProviderAccepted(request_id, provider_account_id) {
        await this.scoring.markAttemptResponse(request_id, provider_account_id, capabilities_schema_1.AssignmentAttemptStatus.ACCEPTED);
        await this.attempts.updateMany({ request_id, provider_account_id: { $ne: provider_account_id }, status: capabilities_schema_1.AssignmentAttemptStatus.PENDING }, { $set: { status: capabilities_schema_1.AssignmentAttemptStatus.CANCELLED, responded_at: new Date() } });
    }
    async expireStale() {
        const now = new Date();
        const stale = await this.attempts.find({ status: capabilities_schema_1.AssignmentAttemptStatus.PENDING, expires_at: { $lt: now } }).lean();
        let expired = 0;
        let rerouted = 0;
        for (const a of stale) {
            await this.attempts.updateOne({ id: a.id }, { $set: { status: capabilities_schema_1.AssignmentAttemptStatus.TIMED_OUT, responded_at: now } });
            expired++;
            const r = await this.requests.findOne({ id: a.request_id });
            if (r && r.status === requests_schema_1.ProviderRequestStatus.PENDING) {
                await this.onProviderRejected(a.request_id, a.provider_account_id, 'timed_out');
                rerouted++;
            }
        }
        return { expired, rerouted, scanned: stale.length };
    }
    async listAttempts(user, request_id) {
        return this.attempts.find({ request_id }).sort({ attempt_index: 1, createdAt: 1 }).lean();
    }
};
exports.AssignmentStrategyService = AssignmentStrategyService;
exports.AssignmentStrategyService = AssignmentStrategyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(1, (0, common_1.Inject)('ProviderAssignmentAttemptRepository')),
    __metadata("design:paramtypes", [providerrequest_repository_1.ProviderRequestRepository,
        providerassignmentattempt_repository_1.ProviderAssignmentAttemptRepository,
        provider_matching_service_1.ProviderMatchingService,
        provider_notifications_service_1.ProviderNotificationsService,
        provider_scoring_service_1.ProviderScoringService])
], AssignmentStrategyService);
//# sourceMappingURL=assignment-strategy.service.js.map