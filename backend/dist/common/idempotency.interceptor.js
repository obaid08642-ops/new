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
exports.IdempotencyInterceptor = exports.RequireIdempotency = exports.REQUIRE_IDEMPOTENCY = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const crypto_1 = require("crypto");
const redis_service_1 = require("../modules/redis/redis.service");
const core_1 = require("@nestjs/core");
exports.REQUIRE_IDEMPOTENCY = 'require_idempotency';
const RequireIdempotency = () => (0, common_1.SetMetadata)(exports.REQUIRE_IDEMPOTENCY, true);
exports.RequireIdempotency = RequireIdempotency;
let IdempotencyInterceptor = class IdempotencyInterceptor {
    constructor(redis, reflector) {
        this.redis = redis;
        this.reflector = reflector;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['idempotency-key'];
        const isMutation = ['POST', 'PATCH', 'DELETE'].includes(request.method);
        const required = this.reflector.get(exports.REQUIRE_IDEMPOTENCY, context.getHandler()) === true;
        if (!idempotencyKey) {
            if (required && isMutation)
                throw new common_1.BadRequestException('idempotency_key_required');
            return next.handle();
        }
        if (!isMutation)
            return next.handle();
        if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) {
            throw new common_1.BadRequestException('invalid_idempotency_key');
        }
        if (!request.user?.id)
            return next.handle();
        const requestPath = request.originalUrl || request.url || '';
        const scope = `${request.user.id}:${request.method}:${requestPath}`;
        const cacheKey = `idempotency:${scope}:${idempotencyKey}`;
        const requestHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(request.body || {})).digest('hex');
        const redis = this.redis.getClient();
        const cachedResponse = await this.redis.getClient().get(cacheKey);
        if (cachedResponse) {
            const cached = JSON.parse(cachedResponse);
            if (cached?.request_hash && cached.request_hash !== requestHash) {
                throw new common_1.BadRequestException('idempotency_key_reused_with_different_request');
            }
            const response = cached?.response ?? cached;
            return (0, rxjs_1.of)(response && typeof response === 'object' ? { ...response, idempotent_replay: true } : response);
        }
        const lockKey = `${cacheKey}:lock`;
        const lockAcquired = await redis.set(lockKey, '1', 'EX', 120, 'NX');
        if (!lockAcquired) {
            throw new common_1.ConflictException('idempotency_request_in_progress');
        }
        return next.handle().pipe((0, operators_1.mergeMap)(async (response) => {
            await redis.set(cacheKey, JSON.stringify({ request_hash: requestHash, response }), 'EX', 86400);
            await redis.del(lockKey);
            return response;
        }), (0, operators_1.catchError)((error) => {
            return new rxjs_1.Observable((subscriber) => {
                redis.del(lockKey).finally(() => subscriber.error(error));
            });
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService, core_1.Reflector])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map