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
exports.PresenceService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let PresenceService = class PresenceService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger('PresenceService');
        this.ONLINE_TTL = 30;
        this.PREFIX = 'presence:';
    }
    key(userId) { return `${this.PREFIX}${userId}`; }
    deviceKey(userId) { return `${this.PREFIX}devices:${userId}`; }
    async setOnline(userId, socketId) {
        const now = Date.now();
        await this.redis.hmset(this.key(userId), {
            user_id: userId,
            online: 'true',
            last_seen: String(now),
        });
        await this.redis.expire(this.key(userId), this.ONLINE_TTL);
        await this.redis.sadd(this.deviceKey(userId), socketId);
        await this.redis.expire(this.deviceKey(userId), this.ONLINE_TTL);
    }
    async setOffline(userId, socketId) {
        await this.redis.srem(this.deviceKey(userId), socketId);
        const devices = await this.redis.smembers(this.deviceKey(userId));
        const now = Date.now();
        if (devices.length === 0) {
            await this.redis.hmset(this.key(userId), {
                user_id: userId,
                online: 'false',
                last_seen: String(now),
            });
            await this.redis.expire(this.key(userId), 86400);
        }
        else {
            await this.redis.expire(this.key(userId), this.ONLINE_TTL);
        }
    }
    async heartbeat(userId, socketId) {
        await this.redis.expire(this.key(userId), this.ONLINE_TTL);
        await this.redis.expire(this.deviceKey(userId), this.ONLINE_TTL);
    }
    async isOnline(userId) {
        const val = await this.redis.hget(this.key(userId), 'online');
        if (val !== 'true')
            return false;
        return await this.redis.exists(this.key(userId));
    }
    async getPresence(userId) {
        const data = await this.redis.hgetall(this.key(userId));
        const devices = await this.redis.smembers(this.deviceKey(userId));
        const exists = await this.redis.exists(this.key(userId));
        return {
            user_id: userId,
            online: exists && data?.online === 'true',
            last_seen: data?.last_seen ? parseInt(data.last_seen) : 0,
            device_count: devices.length,
        };
    }
    async getBulkPresence(userIds) {
        return Promise.all(userIds.map(id => this.getPresence(id)));
    }
    async getLastSeen(userId) {
        const ts = await this.redis.hget(this.key(userId), 'last_seen');
        return ts ? new Date(parseInt(ts)) : null;
    }
};
exports.PresenceService = PresenceService;
exports.PresenceService = PresenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], PresenceService);
//# sourceMappingURL=presence.service.js.map