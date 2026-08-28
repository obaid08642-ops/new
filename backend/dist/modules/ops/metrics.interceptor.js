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
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const redis_service_1 = require("../redis/redis.service");
let MetricsInterceptor = class MetricsInterceptor {
    constructor(redis) {
        this.redis = redis;
    }
    normalize(path) {
        return (path || '/')
            .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
            .replace(/[0-9a-f]{24}/gi, ':id')
            .replace(/\/\d{3,}(?=\/|$)/g, '/:id')
            .slice(0, 180);
    }
    intercept(ctx, next) {
        if (ctx.getType() !== 'http')
            return next.handle();
        const req = ctx.switchToHttp().getRequest();
        const res = ctx.switchToHttp().getResponse();
        const path = this.normalize(req.path || req.url || '/');
        const day = new Date().toISOString().slice(0, 10);
        const reqKey = `ops:req:${day}`;
        const stKey = `ops:status:${day}`;
        const record = (statusCode) => {
            try {
                const client = this.redis.getClient?.();
                if (!client)
                    return;
                const klass = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : '2xx';
                const pipe = client.multi();
                pipe.hincrby(reqKey, path, 1);
                pipe.hincrby(stKey, klass, 1);
                pipe.hincrby(stKey, `${klass}:${path}`, 1);
                pipe.expire(reqKey, 14 * 86400);
                pipe.expire(stKey, 14 * 86400);
                pipe.exec().catch(() => { });
            }
            catch { }
        };
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => record(res.statusCode || 200),
            error: (err) => record(err?.status || err?.statusCode || 500),
        }));
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map