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
exports.ProviderRequestEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const requests_schema_1 = require("../schemas/requests.schema");
const provider_notifications_service_1 = require("./provider-notifications.service");
const provider_scoring_service_1 = require("./provider-scoring.service");
const assignment_strategy_service_1 = require("./assignment-strategy.service");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
const provideroperator_repository_1 = require("./repositories/provideroperator.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
let ProviderRequestEngineService = class ProviderRequestEngineService {
    constructor(requests, audit, notifs, scoring, events, assignment, operators) {
        this.requests = requests;
        this.audit = audit;
        this.notifs = notifs;
        this.scoring = scoring;
        this.events = events;
        this.assignment = assignment;
        this.operators = operators;
        this.logger = new common_1.Logger('ProviderRequestEngine');
    }
    async list(user, q) {
        assertProvider(user);
        const filter = { provider_account_id: user.id };
        if (q.status)
            filter.status = q.status;
        if (q.type)
            filter.type = q.type;
        const limit = Math.min(parseInt(q.limit || '50', 10) || 50, 200);
        const offset = parseInt(q.offset || '0', 10) || 0;
        let queryChain = this.requests.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit);
        const items = await queryChain.lean();
        const total = await this.requests.countDocuments(filter);
        return { items, total, limit, offset };
    }
    async detail(user, id) {
        assertProvider(user);
        const r = await this.requests.findOne({ id, provider_account_id: user.id }).lean();
        if (!r)
            throw new common_1.NotFoundException('request not found');
        return r;
    }
    async transition(user, id, to, action, extra = {}) {
        assertProvider(user);
        const r = await this.requests.findOne({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException('request not found');
        const allowed = requests_schema_1.PROVIDER_REQUEST_TRANSITIONS[r.status] || [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`cannot transition from ${r.status} to ${to}`);
        }
        const now = new Date();
        r.timeline.push({ at: now, status: to, by_role: 'provider', by_user_id: user.id, note: extra.note });
        r.provider_action_log.push({ at: now, action, by_user_id: user.id, note: extra.note, reason: extra.reason });
        r.status = to;
        if (to === requests_schema_1.ProviderRequestStatus.ACCEPTED) {
            r.accepted_at = now;
            if (!r.scheduled_at)
                r.scheduled_at = now;
        }
        if (to === requests_schema_1.ProviderRequestStatus.REJECTED) {
            r.rejected_at = now;
            r.rejection_reason = extra.reason || extra.note;
        }
        if (to === requests_schema_1.ProviderRequestStatus.IN_PROGRESS)
            r.started_at = now;
        if (to === requests_schema_1.ProviderRequestStatus.COMPLETED)
            r.completed_at = now;
        if (to === requests_schema_1.ProviderRequestStatus.CANCELLED)
            r.cancelled_at = now;
        await r.save();
        await this.audit.create({
            provider_account_id: user.id,
            actor_id: user.id,
            actor_role: 'provider',
            action: `request.${action}`,
            target: { collection: 'provider_requests', id: r.id },
            after: { status: r.status },
        });
        if (to === requests_schema_1.ProviderRequestStatus.ACCEPTED) {
            try {
                await this.assignment.onProviderAccepted(r.id, user.id);
            }
            catch (e) {
                this.logger.warn(`assignment.onAccepted failed: ${e?.message}`);
            }
        }
        else if (to === requests_schema_1.ProviderRequestStatus.REJECTED) {
            try {
                await this.assignment.onProviderRejected(r.id, user.id, extra.reason);
            }
            catch (e) {
                this.logger.warn(`assignment.onRejected failed: ${e?.message}`);
            }
        }
        try {
            await this.scoring.onLifecycleEvent(user.id);
        }
        catch { }
        await this.notifs.createSystem(user.id, {
            type: 'request_status',
            title_ar: this.statusTitleAr(to),
            title_en: this.statusTitleEn(to),
            body_ar: r.summary_ar || r.patient?.name,
            body_en: r.summary_en || r.patient?.name,
            related_id: r.id,
            related_type: 'request',
            icon: this.typeIcon(r.type),
        });
        return r.toObject();
    }
    accept(user, id, body = {}) {
        return this.transition(user, id, requests_schema_1.ProviderRequestStatus.ACCEPTED, 'accept', { note: body.note });
    }
    reject(user, id, body = {}) {
        return this.transition(user, id, requests_schema_1.ProviderRequestStatus.REJECTED, 'reject', { reason: body.reason, note: body.note });
    }
    start(user, id, body = {}) {
        return this.transition(user, id, requests_schema_1.ProviderRequestStatus.IN_PROGRESS, 'start', { note: body.note });
    }
    complete(user, id, body = {}) {
        return this.transition(user, id, requests_schema_1.ProviderRequestStatus.COMPLETED, 'complete', { note: body.note });
    }
    cancel(user, id, body = {}) {
        return this.transition(user, id, requests_schema_1.ProviderRequestStatus.CANCELLED, 'cancel', { reason: body.reason, note: body.note });
    }
    async assignStaff(user, id, body) {
        if (!body?.staff_id || typeof body.staff_id !== 'string')
            throw new common_1.BadRequestException('staff_id_required');
        const r = await this.requests.findOne({ id });
        if (!r)
            throw new (await Promise.resolve().then(() => __importStar(require('@nestjs/common')))).NotFoundException('request_not_found');
        const acc = user.provider_account_id || user.id;
        if (r.provider_account_id !== acc && user.role !== 'admin' && user.parent_provider_account_id !== acc) {
            throw new (await Promise.resolve().then(() => __importStar(require('@nestjs/common')))).ForbiddenException('not_owner');
        }
        const staff = await this.operators.findOne({
            id: body.staff_id,
            provider_account_id: r.provider_account_id,
            status: 'active',
        });
        if (!staff)
            throw new common_1.ForbiddenException('staff_not_in_active_facility_roster');
        const now = new Date();
        const previousStaffId = r.assigned_staff_id || null;
        r.assigned_staff_id = staff.id;
        r.assigned_staff_name = staff.full_name || staff.email || undefined;
        r.assigned_at = now;
        r.assignment_roster_id = staff.id;
        if (body.notes)
            r.assignment_notes = String(body.notes).slice(0, 1000);
        await r.save();
        await this.audit.create({
            provider_account_id: r.provider_account_id,
            actor_id: user.id,
            actor_role: user.role || 'provider',
            action: 'request.staff_assigned',
            target: { collection: 'provider_requests', id: r.id },
            before: { assigned_staff_id: previousStaffId },
            after: { assigned_staff_id: staff.id, assignment_roster_id: staff.id },
        });
        return r.toObject();
    }
    async createInternal(input) {
        const now = new Date();
        const r = await this.requests.create({
            provider_account_id: input.provider_account_id,
            type: input.type,
            status: requests_schema_1.ProviderRequestStatus.PENDING,
            priority: input.priority || requests_schema_1.ProviderRequestPriority.NORMAL,
            patient: input.patient,
            payload: input.payload,
            summary_ar: input.summary_ar,
            summary_en: input.summary_en,
            amount_total: input.amount_total || 0,
            scheduled_at: input.scheduled_at,
            seeded: !!input.seeded,
            timeline: [{ at: now, status: requests_schema_1.ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'seed', note: 'request created' }],
        });
        await this.notifs.createSystem(input.provider_account_id, {
            type: 'new_request',
            title_ar: 'طلب جديد بانتظار قبولك',
            title_en: 'New request awaiting your acceptance',
            body_ar: input.summary_ar,
            body_en: input.summary_en,
            related_id: r.id,
            related_type: 'request',
            icon: this.typeIcon(input.type),
        });
        const createdReq = r.toObject();
        this.events.emit('chat.broadcast', {
            room: `provider_${input.provider_account_id}`,
            event: 'new_consultation_request',
            payload: {
                id: createdReq.id,
                patient_name: input.patient?.name || 'مريض',
                service_type: input.type,
                total: input.amount_total || 0,
                scheduled_at: input.scheduled_at,
                urgent: input.priority === 'urgent'
            }
        });
        return createdReq;
    }
    statusTitleAr(s) {
        const m = {
            accepted: 'تم قبول الطلب', rejected: 'تم رفض الطلب', in_progress: 'الطلب قيد التنفيذ',
            completed: 'تم إنجاز الطلب', cancelled: 'تم إلغاء الطلب', pending: 'طلب جديد',
        };
        return m[s] || s;
    }
    statusTitleEn(s) {
        const m = {
            accepted: 'Request accepted', rejected: 'Request rejected', in_progress: 'Request in progress',
            completed: 'Request completed', cancelled: 'Request cancelled', pending: 'New request',
        };
        return m[s] || s;
    }
    typeIcon(t) {
        const m = { pharmacy: 'pill', lab: 'flask', radiology: 'scan', doctor: 'stethoscope', home_care: 'home' };
        return m[t] || 'bell';
    }
};
exports.ProviderRequestEngineService = ProviderRequestEngineService;
exports.ProviderRequestEngineService = ProviderRequestEngineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(1, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => assignment_strategy_service_1.AssignmentStrategyService))),
    __param(6, (0, common_1.Inject)('ProviderOperatorRepository')),
    __metadata("design:paramtypes", [providerrequest_repository_1.ProviderRequestRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        provider_notifications_service_1.ProviderNotificationsService,
        provider_scoring_service_1.ProviderScoringService,
        event_emitter_1.EventEmitter2,
        assignment_strategy_service_1.AssignmentStrategyService,
        provideroperator_repository_1.ProviderOperatorRepository])
], ProviderRequestEngineService);
//# sourceMappingURL=provider-request-engine.service.js.map