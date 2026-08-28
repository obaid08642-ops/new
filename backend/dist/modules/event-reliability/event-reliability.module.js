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
exports.EventReliabilityModule = exports.EventReliabilityController = exports.EventReliabilityService = exports.EventDeliverySchema = exports.EventDelivery = exports.EventDlqSchema = exports.EventDlq = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const system_event_schema_1 = require("../events/system-event.schema");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_2 = require("@nestjs/common");
let EventDlq = class EventDlq extends mongoose_3.Document {
};
exports.EventDlq = EventDlq;
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EventDlq.prototype, "original_event_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EventDlq.prototype, "type", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], EventDlq.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], EventDlq.prototype, "entity_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Object }),
    __metadata("design:type", Object)
], EventDlq.prototype, "payload", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], EventDlq.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], EventDlq.prototype, "last_error", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'pending', enum: ['pending', 'retried', 'replayed', 'dead'], index: true }),
    __metadata("design:type", String)
], EventDlq.prototype, "status", void 0);
exports.EventDlq = EventDlq = __decorate([
    (0, mongoose_2.Schema)({ collection: 'event_dlq', timestamps: true })
], EventDlq);
exports.EventDlqSchema = mongoose_2.SchemaFactory.createForClass(EventDlq);
let EventDelivery = class EventDelivery extends mongoose_3.Document {
};
exports.EventDelivery = EventDelivery;
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EventDelivery.prototype, "event_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], EventDelivery.prototype, "type", void 0);
__decorate([
    (0, mongoose_2.Prop)({ index: true }),
    __metadata("design:type", String)
], EventDelivery.prototype, "listener", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'delivered', enum: ['delivered', 'failed'] }),
    __metadata("design:type", String)
], EventDelivery.prototype, "status", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], EventDelivery.prototype, "error", void 0);
exports.EventDelivery = EventDelivery = __decorate([
    (0, mongoose_2.Schema)({ collection: 'event_delivery_log', timestamps: true })
], EventDelivery);
exports.EventDeliverySchema = mongoose_2.SchemaFactory.createForClass(EventDelivery);
let EventReliabilityService = class EventReliabilityService {
    constructor(events, dlq, delivery, bus) {
        this.events = events;
        this.dlq = dlq;
        this.delivery = delivery;
        this.bus = bus;
    }
    async onAnyServiceEvent(payload, ...args) {
        try {
            await this.delivery.create({
                event_id: payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: payload?.type || 'service.unknown',
                listener: 'reliability_logger',
                status: 'delivered',
            });
        }
        catch { }
    }
    async pushToDlq(event, error) {
        return this.dlq.create({
            original_event_id: event?.id || '',
            type: event?.type || 'unknown',
            entity_type: event?.entity_type,
            entity_id: event?.entity_id,
            payload: event,
            attempts: 0,
            last_error: error,
            status: 'pending',
        });
    }
    async status() {
        const since24 = new Date(Date.now() - 86400000);
        const [delivered24, failed24, dlqPending, dlqDead, totalEvents] = await Promise.all([
            this.delivery.countDocuments({ status: 'delivered', createdAt: { $gte: since24 } }),
            this.delivery.countDocuments({ status: 'failed', createdAt: { $gte: since24 } }),
            this.dlq.countDocuments({ status: 'pending' }),
            this.dlq.countDocuments({ status: 'dead' }),
            this.events.estimatedDocumentCount(),
        ]);
        const recentDlq = await this.dlq.find({ status: 'pending' }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(20).lean();
        return {
            window: '24h',
            delivered: delivered24,
            failed: failed24,
            dlq_pending: dlqPending,
            dlq_dead: dlqDead,
            events_total: totalEvents,
            recent_dlq: recentDlq,
            generated_at: new Date(),
        };
    }
    async retryFailed() {
        const pending = await this.dlq.find({ status: 'pending' }).limit(200);
        let retried = 0, deadlined = 0;
        for (const d of pending) {
            try {
                await this.bus.emitAsync(d.type, d.payload);
                d.attempts = (d.attempts || 0) + 1;
                d.status = 'retried';
                await d.save();
                retried++;
            }
            catch (e) {
                d.attempts = (d.attempts || 0) + 1;
                d.last_error = String(e?.message || e);
                if (d.attempts >= 5) {
                    d.status = 'dead';
                    deadlined++;
                }
                await d.save();
            }
        }
        return { retried, deadlined, remaining_pending: await this.dlq.countDocuments({ status: 'pending' }) };
    }
    async replayOne(eventId) {
        const evt = await this.events.findOne({ id: eventId }, { _id: 0, __v: 0 }).lean();
        if (!evt)
            return { ok: false, error: 'event_not_found' };
        try {
            await this.bus.emitAsync(evt.type, evt);
            return { ok: true, replayed: evt.type };
        }
        catch (e) {
            return { ok: false, error: String(e?.message || e) };
        }
    }
};
exports.EventReliabilityService = EventReliabilityService;
__decorate([
    (0, event_emitter_1.OnEvent)('service.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventReliabilityService.prototype, "onAnyServiceEvent", null);
exports.EventReliabilityService = EventReliabilityService = __decorate([
    (0, common_2.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('SystemEvent')),
    __param(1, (0, mongoose_1.InjectModel)('EventDlq')),
    __param(2, (0, mongoose_1.InjectModel)('EventDelivery')),
    __metadata("design:paramtypes", [mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Model,
        event_emitter_1.EventEmitter2])
], EventReliabilityService);
let EventReliabilityController = class EventReliabilityController {
    constructor(svc) {
        this.svc = svc;
    }
    status() { return this.svc.status(); }
    retry() { return this.svc.retryFailed(); }
    replay(id) { return this.svc.replayOne(id); }
};
exports.EventReliabilityController = EventReliabilityController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EventReliabilityController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('retry-failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EventReliabilityController.prototype, "retry", null);
__decorate([
    (0, common_1.Post)('replay/:eventId'),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EventReliabilityController.prototype, "replay", null);
exports.EventReliabilityController = EventReliabilityController = __decorate([
    (0, common_1.Controller)('events'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [EventReliabilityService])
], EventReliabilityController);
let EventReliabilityModule = class EventReliabilityModule {
};
exports.EventReliabilityModule = EventReliabilityModule;
exports.EventReliabilityModule = EventReliabilityModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'SystemEvent', schema: system_event_schema_1.SystemEventSchema },
                { name: 'EventDlq', schema: exports.EventDlqSchema },
                { name: 'EventDelivery', schema: exports.EventDeliverySchema },
            ])],
        controllers: [EventReliabilityController],
        providers: [EventReliabilityService],
        exports: [EventReliabilityService],
    })
], EventReliabilityModule);
//# sourceMappingURL=event-reliability.module.js.map