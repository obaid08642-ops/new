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
exports.VelocityGuard = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../modules/redis/redis.service");
let VelocityGuard = class VelocityGuard {
    constructor(redisService) {
        this.redisService = redisService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id || request.ip;
        const MAX_ATTEMPTS = 5;
        const WINDOW_SECONDS = 600;
        const rateLimitKey = `velocity:payment:${userId}`;
        const { allowed, remaining } = await this.redisService.checkRateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_SECONDS);
        if (!allowed) {
            throw new common_1.HttpException({
                status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                error: 'Too many payment attempts. Please try again after 10 minutes. (Velocity Check Failed)',
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
};
exports.VelocityGuard = VelocityGuard;
exports.VelocityGuard = VelocityGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], VelocityGuard);
//# sourceMappingURL=velocity.guard.js.map