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
exports.SystemHealthController = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const redis_service_1 = require("../redis/redis.service");
let SystemHealthController = class SystemHealthController {
    constructor(health, mongoose, redisService) {
        this.health = health;
        this.mongoose = mongoose;
        this.redisService = redisService;
    }
    checkLiveness() {
        return this.health.check([
            () => this.mongoose.pingCheck('mongodb'),
            async () => {
                const isConnected = await this.redisService.getClient().ping() === 'PONG';
                return {
                    redis: {
                        status: isConnected ? 'up' : 'down',
                    },
                };
            },
        ]);
    }
    async checkReadiness() {
        const result = await this.checkLiveness();
        return { ...result, uptime: Math.round(process.uptime()) };
    }
};
exports.SystemHealthController = SystemHealthController;
__decorate([
    (0, common_1.Get)('liveness'),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SystemHealthController.prototype, "checkLiveness", null);
__decorate([
    (0, common_1.Get)('readiness'),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SystemHealthController.prototype, "checkReadiness", null);
exports.SystemHealthController = SystemHealthController = __decorate([
    (0, common_1.Controller)('system-health'),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.MongooseHealthIndicator,
        redis_service_1.RedisService])
], SystemHealthController);
//# sourceMappingURL=system-health.controller.js.map