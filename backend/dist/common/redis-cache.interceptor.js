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
exports.RedisCacheInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const redis_service_1 = require("../modules/redis/redis.service");
let RedisCacheInterceptor = class RedisCacheInterceptor {
    constructor(redis) {
        this.redis = redis;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (request.method !== 'GET') {
            return next.handle();
        }
        if (request.headers.authorization) {
            return next.handle();
        }
        const cacheKey = `http_cache:${request.originalUrl}`;
        const cachedResponse = await this.redis.getClient().get(cacheKey);
        if (cachedResponse) {
            return (0, rxjs_1.of)(JSON.parse(cachedResponse));
        }
        return next.handle().pipe((0, operators_1.tap)(async (response) => {
            if (response) {
                await this.redis.getClient().set(cacheKey, JSON.stringify(response), 'EX', 300);
            }
        }));
    }
};
exports.RedisCacheInterceptor = RedisCacheInterceptor;
exports.RedisCacheInterceptor = RedisCacheInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RedisCacheInterceptor);
//# sourceMappingURL=redis-cache.interceptor.js.map