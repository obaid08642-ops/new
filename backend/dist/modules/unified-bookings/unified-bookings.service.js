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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedBookingsService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_service_1 = require("../redis/redis.service");
let UnifiedBookingsService = class UnifiedBookingsService {
    constructor() {
        this.redisClient = new ioredis_1.default((0, redis_service_1.redisUrlFromEnv)());
    }
    async acquireBookingLock(providerId, slotStartTimestamp, patientId) {
        const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
        const ttlSeconds = 300;
        const lockAcquired = await this.redisClient.set(lockKey, patientId, 'EX', ttlSeconds, 'NX');
        if (!lockAcquired) {
            throw new common_1.ConflictException({
                code: 'CONCURRENT_SLOT_CONFLICT',
                message: 'هذا الوقت محجوز حالياً ومقفل لعملية دفع أخرى، يرجى المحاولة بعد 5 دقائق أو اختيار موعد آخر.'
            });
        }
    }
    async releaseBookingLock(providerId, slotStartTimestamp) {
        const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
        await this.redisClient.del(lockKey);
    }
};
exports.UnifiedBookingsService = UnifiedBookingsService;
exports.UnifiedBookingsService = UnifiedBookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UnifiedBookingsService);
//# sourceMappingURL=unified-bookings.service.js.map