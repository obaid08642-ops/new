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
exports.ApiSecurityModule = exports.ApiSecurityController = exports.ApiSecurityMiddleware = exports.ApiSecurityService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_service_1 = require("../redis/redis.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const LIMITS = [
    { pattern: /\/auth\/(login|register|social-login)/, name: 'login', perMinute: 5, perHour: 30 },
    { pattern: /\/auth\/(send-otp|verify-otp|verify-2fa|forgot-password)/, name: 'otp', perMinute: 3, perHour: 10 },
    { pattern: /\/medicines(\?|$)/, name: 'search', perMinute: 30, perHour: 500 },
    { pattern: /\/storage\/upload/, name: 'uploads', perMinute: 10, perHour: 60 },
    { pattern: /\/orders\/create/, name: 'orders', perMinute: 10, perHour: 40 },
    { pattern: /.*/, name: 'general', perMinute: 120, perHour: 3000 },
];
const HONEYPOTS = new Set([
    '/api/v1/admin/secret-config',
    '/api/v1/internal/keys',
    '/api/v1/debug/vars',
    '/api/v1/wp-login.php',
    '/api/v1/.env',
    '/api/v1/xmlrpc.php',
    '/api/v1/medicines/export-all',
]);
let ApiSecurityService = class ApiSecurityService {
    constructor(redis, conn) {
        this.redis = redis;
        this.conn = conn;
        this.logger = new common_1.Logger('ApiSecurity');
    }
    get events() { return this.conn.collection('security_events'); }
    client() { return this.redis.getClient?.(); }
    async logEvent(type, req, extra = {}) {
        try {
            await this.events.insertOne({
                type,
                ip: req.ip || req.connection?.remoteAddress || null,
                device_id: req.headers?.['x-device-id'] || null,
                user_agent: req.headers?.['user-agent'] || null,
                path: req.originalUrl || req.url || null,
                ...extra,
                createdAt: new Date(),
            });
        }
        catch { }
    }
    async isBlacklisted(ip, deviceId) {
        const c = this.client();
        if (!c)
            return false;
        if (ip && (await c.get(`blacklist:ip:${ip}`)))
            return true;
        if (deviceId && (await c.get(`blacklist:dev:${deviceId}`)))
            return true;
        return false;
    }
    async blacklist(key, reason, ttlSeconds = 3600) {
        const c = this.client();
        if (c)
            await c.set(key, reason, 'EX', ttlSeconds);
        this.logger.warn(`BLACKLISTED ${key} — ${reason}`);
    }
    async checkRate(req, userId) {
        const url = req.originalUrl || req.url || '';
        const ip = req.ip || 'unknown';
        const deviceId = req.headers?.['x-device-id'] || undefined;
        if (await this.isBlacklisted(ip, deviceId)) {
            return { allowed: false, className: 'blacklist', retryAfter: 3600 };
        }
        const cls = LIMITS.find(l => l.pattern.test(url)) || LIMITS[LIMITS.length - 1];
        const c = this.client();
        if (!c)
            return { allowed: true, className: cls.name };
        const keys = [
            `rl:${cls.name}:ip:${ip}`,
            ...(userId ? [`rl:${cls.name}:user:${userId}`] : []),
            ...(deviceId ? [`rl:${cls.name}:dev:${deviceId}`] : []),
        ];
        for (const k of keys) {
            const n = await c.incr(k);
            if (n === 1)
                await c.expire(k, 60);
            if (n > cls.perMinute) {
                const hk = `${k}:h`;
                const hn = await c.incr(hk);
                if (hn === 1)
                    await c.expire(hk, 3600);
                if (hn > cls.perHour) {
                    const blkKey = deviceId ? `blacklist:dev:${deviceId}` : `blacklist:ip:${ip}`;
                    await this.blacklist(blkKey, `rate-abuse:${cls.name}`, 3600);
                    await this.logEvent('abuse.blacklist', req, { className: cls.name, hits: hn });
                }
                return { allowed: false, className: cls.name, retryAfter: 60 };
            }
        }
        const idMatch = url.match(/\/(\d{5,})(?:\/|$|\?)/);
        if (idMatch) {
            const id = parseInt(idMatch[1], 10);
            const seqKey = `seq:${ip}`;
            const streakKey = `seqstreak:${ip}`;
            const last = parseInt((await c.get(seqKey)) || '0', 10);
            if (id === last + 1 || id === last + 2) {
                const streak = await c.incr(streakKey);
                if (streak === 1)
                    await c.expire(streakKey, 120);
                if (streak >= 12) {
                    await this.blacklist(`blacklist:ip:${ip}`, 'enumeration-scraping', 7200);
                    await this.logEvent('abuse.enumeration', req, { streak });
                    return { allowed: false, className: 'enumeration', retryAfter: 600 };
                }
            }
            else {
                await c.del(streakKey).catch(() => { });
            }
            await c.set(seqKey, String(id), 'EX', 120);
        }
        return { allowed: true, className: cls.name };
    }
};
exports.ApiSecurityService = ApiSecurityService;
exports.ApiSecurityService = ApiSecurityService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        mongoose_2.Connection])
], ApiSecurityService);
let ApiSecurityMiddleware = class ApiSecurityMiddleware {
    constructor(sec) {
        this.sec = sec;
    }
    async use(req, res, next) {
        const url = req.originalUrl || req.url || '';
        if (HONEYPOTS.has(url.split('?')[0])) {
            const ip = req.ip || 'unknown';
            const deviceId = req.headers?.['x-device-id'];
            await this.sec.blacklist(deviceId ? `blacklist:dev:${deviceId}` : `blacklist:ip:${ip}`, 'honeypot', 86400);
            await this.sec.logEvent('abuse.honeypot', req, {});
            return res.status(200).json({ status: 'ok', data: [] });
        }
        const verdict = await this.sec.checkRate(req, req.user?.id);
        if (!verdict.allowed) {
            await this.sec.logEvent('abuse.rate_limited', req, { className: verdict.className });
            const origin = req.headers?.origin || '';
            const allowed = (process.env.CORS_ORIGINS || 'https://nabd.plus,https://www.nabd.plus,https://admin.nabd.plus,https://provider.nabd.plus')
                .split(',').map((s) => s.trim().replace(/"/g, ''));
            if (origin && allowed.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            res.setHeader('Retry-After', String(verdict.retryAfter || 60));
            return res.status(common_1.HttpStatus.TOO_MANY_REQUESTS).json({
                statusCode: 429,
                message: 'Too many requests',
                retry_after: verdict.retryAfter || 60,
            });
        }
        next();
    }
};
exports.ApiSecurityMiddleware = ApiSecurityMiddleware;
exports.ApiSecurityMiddleware = ApiSecurityMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ApiSecurityService])
], ApiSecurityMiddleware);
let ApiSecurityController = class ApiSecurityController {
    constructor(sec) {
        this.sec = sec;
    }
    async events() {
        const rows = await this.sec.events
            .find({}, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(100).toArray();
        const counts = await this.sec.events.aggregate([
            { $group: { _id: '$type', n: { $sum: 1 } } },
            { $sort: { n: -1 } },
        ]).toArray();
        return { data: rows, counts };
    }
    async clear(body) {
        const c = this.sec.client?.();
        if (c && body?.key)
            await c.del(`blacklist:ip:${body.key}`, `blacklist:dev:${body.key}`);
        return { ok: true };
    }
};
exports.ApiSecurityController = ApiSecurityController;
__decorate([
    (0, common_1.Get)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ApiSecurityController.prototype, "events", null);
__decorate([
    (0, common_1.Post)('blacklist/clear'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApiSecurityController.prototype, "clear", null);
exports.ApiSecurityController = ApiSecurityController = __decorate([
    (0, common_1.Controller)('admin/security'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [ApiSecurityService])
], ApiSecurityController);
let ApiSecurityModule = class ApiSecurityModule {
    configure(consumer) {
        consumer.apply(ApiSecurityMiddleware).forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.ApiSecurityModule = ApiSecurityModule;
exports.ApiSecurityModule = ApiSecurityModule = __decorate([
    (0, common_1.Module)({
        controllers: [ApiSecurityController],
        providers: [ApiSecurityService, ApiSecurityMiddleware],
        exports: [ApiSecurityService],
    })
], ApiSecurityModule);
//# sourceMappingURL=api-security.module.js.map