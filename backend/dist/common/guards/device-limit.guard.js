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
exports.DeviceLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../modules/redis/redis.service");
let DeviceLimitGuard = class DeviceLimitGuard {
    constructor(redisService) {
        this.redisService = redisService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const deviceId = request.headers['x-device-id'];
        if (!deviceId) {
            throw new common_1.HttpException({
                status: common_1.HttpStatus.BAD_REQUEST,
                error: 'Device Fingerprint missing. Registration rejected.',
            }, common_1.HttpStatus.BAD_REQUEST);
        }
        const MAX_ACCOUNTS = 3;
        const deviceKey = `device_fingerprint:${deviceId}:accounts`;
        if (request.body && request.body.phone) {
            await this.redisService.sadd(deviceKey, request.body.phone);
        }
        const accountCount = (await this.redisService.smembers(deviceKey)).length;
        if (accountCount > MAX_ACCOUNTS) {
            throw new common_1.HttpException({
                status: common_1.HttpStatus.FORBIDDEN,
                error: 'Fraud Prevention: Max 3 unique accounts allowed per device.',
            }, common_1.HttpStatus.FORBIDDEN);
        }
        return true;
    }
};
exports.DeviceLimitGuard = DeviceLimitGuard;
exports.DeviceLimitGuard = DeviceLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], DeviceLimitGuard);
//# sourceMappingURL=device-limit.guard.js.map