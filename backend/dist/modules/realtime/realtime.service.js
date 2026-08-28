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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const presence_service_1 = require("../presence/presence.service");
const redis_service_1 = require("../redis/redis.service");
let RealtimeService = class RealtimeService {
    constructor(em, presenceService, redis) {
        this.em = em;
        this.presenceService = presenceService;
        this.redis = redis;
        this.logger = new common_1.Logger('RealtimeService');
        this.server = null;
    }
    setServer(s) { this.server = s; }
    async emitToUser(userId, event, data) {
        if (this.server) {
            const presence = await this.presenceService.getPresence(userId);
            if (presence.online) {
                this.server.to(`user:${userId}`).emit(event, data);
            }
            else {
                await this.redis.getClient().lpush(`offline_events:${userId}`, JSON.stringify({ event, data, ts: Date.now() }));
            }
        }
        this.em.emit('realtime.user', { user_id: userId, event, payload: data });
    }
    emitToRole(role, event, data) {
        if (this.server)
            this.server.to(`role:${role}`).emit(event, data);
    }
    emitToChannel(channel, event, data) {
        if (this.server)
            this.server.to(channel).emit(event, data);
    }
    emitGlobal(event, data) {
        if (this.server)
            this.server.emit(event, data);
    }
    emitToBooking(kind, id, event, data) {
        if (this.server)
            this.server.to(`booking:${kind}:${id}`).emit(event, data);
        this.em.emit('realtime.booking', { kind, id, event, payload: data });
    }
    async setUserOnline(userId, socketId) {
        if (this.presenceService)
            await this.presenceService.setOnline(userId, socketId);
    }
    async setUserOffline(userId, socketId) {
        if (this.presenceService)
            await this.presenceService.setOffline(userId, socketId);
    }
    async heartbeat(userId, socketId) {
        if (this.presenceService)
            await this.presenceService.heartbeat(userId, socketId);
    }
    async getPresence(userId) {
        if (this.presenceService)
            return this.presenceService.getPresence(userId);
        return { user_id: userId, online: false };
    }
    async getBulkPresence(userIds) {
        if (this.presenceService)
            return this.presenceService.getBulkPresence(userIds);
        return userIds.map(id => ({ user_id: id, online: false }));
    }
};
exports.RealtimeService = RealtimeService;
exports.RealtimeService = RealtimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        presence_service_1.PresenceService,
        redis_service_1.RedisService])
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map