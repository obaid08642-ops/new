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
exports.EventBusService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const systemevent_repository_1 = require("./repositories/systemevent.repository");
let EventBusService = class EventBusService {
    constructor(events, emitter) {
        this.events = events;
        this.emitter = emitter;
        this.logger = new common_1.Logger('EventBus');
    }
    async emit(input) {
        try {
            await this.events.create({
                type: input.type,
                entity_type: input.entity_type,
                entity_id: input.entity_id,
                idempotency_key: input.idempotency_key,
                actor_account_id: input.actor_account_id,
                actor_role: input.actor_role || 'system',
                reason_code: input.reason_code,
                patient_account_id: input.patient_account_id,
                pharmacy_account_id: input.pharmacy_account_id,
                before: input.before,
                after: input.after,
                meta: input.meta,
            });
        }
        catch (e) {
            if (input.idempotency_key && e?.code === 11000) {
                this.logger.log(`emit_duplicate type=${input.type} key=${input.idempotency_key}`);
                return { duplicate: true };
            }
            this.logger.warn(`emit_failed type=${input.type} err=${e?.message}`);
            throw e;
        }
        try {
            this.emitter?.emit(input.type, input);
        }
        catch (e) {
            this.logger.warn(`emitter_fanout_failed type=${input.type} err=${e?.message}`);
        }
        return { duplicate: false };
    }
    async list(filter) {
        const q = {};
        if (filter.type)
            q.type = filter.type;
        if (filter.entity_type)
            q.entity_type = filter.entity_type;
        if (filter.entity_id)
            q.entity_id = filter.entity_id;
        if (filter.pharmacy_account_id)
            q.pharmacy_account_id = filter.pharmacy_account_id;
        if (filter.patient_account_id)
            q.patient_account_id = filter.patient_account_id;
        if (filter.since)
            q.createdAt = { $gte: filter.since };
        const limit = Math.min(filter.limit || 200, 1000);
        return this.events.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit).lean();
    }
};
exports.EventBusService = EventBusService;
exports.EventBusService = EventBusService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SystemEventRepository')),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [systemevent_repository_1.SystemEventRepository,
        event_emitter_1.EventEmitter2])
], EventBusService);
//# sourceMappingURL=event-bus.service.js.map