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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./common/auth.guard");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_service_1 = require("./modules/redis/redis.service");
let HealthController = class HealthController {
    constructor(connection, redis) {
        this.connection = connection;
        this.redis = redis;
    }
    root() {
        return {
            app: 'Nabd Healthcare OS (NestJS)',
            status: 'ok',
            time: new Date().toISOString(),
            version: '1.0.0',
        };
    }
    liveness() {
        return { status: 'up' };
    }
    async health() {
        let mongoOk = false;
        let redisOk = false;
        try {
            mongoOk = this.connection.readyState === 1;
        }
        catch { }
        try {
            const pong = await this.redis.getClient().ping();
            redisOk = pong === 'PONG';
        }
        catch { }
        const status = mongoOk && redisOk ? 'ok' : 'degraded';
        return {
            status,
            time: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            details: {
                mongodb: mongoOk ? 'up' : 'down',
                redis: redisOk ? 'up' : 'down',
            },
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "root", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('health/liveness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "liveness", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('health/readiness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "health", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        redis_service_1.RedisService])
], HealthController);
//# sourceMappingURL=health.controller.js.map