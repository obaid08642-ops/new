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
exports.HealthDashboardController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const redis_service_1 = require("../redis/redis.service");
let HealthDashboardController = class HealthDashboardController {
    constructor(conn, redis) {
        this.conn = conn;
        this.redis = redis;
    }
    async probe(fn) {
        const t0 = Date.now();
        try {
            await fn();
            return { status: 'up', latency_ms: Date.now() - t0 };
        }
        catch {
            return { status: 'down', latency_ms: null };
        }
    }
    async dashboard() {
        const t0 = Date.now();
        const [mongo, redis, livekit, coturn, r2, fcm, resend] = await Promise.all([
            this.probe(() => this.conn.db.admin().ping()),
            this.probe(async () => {
                const c = this.redis.getClient?.();
                if (!c)
                    throw new Error('no client');
                const r = await c.ping();
                if (r !== 'PONG')
                    throw new Error(r);
            }),
            this.probe(() => fetch(process.env.LIVEKIT_URL?.replace('wss://', 'https://').replace('ws://', 'http://') || 'http://livekit:7880', { signal: AbortSignal.timeout(4000) }).then(r => { if (!r.ok && r.status !== 404)
                throw new Error(String(r.status)); })),
            this.probe(() => Promise.resolve(process.env.COTURN_HOST ? true : Promise.reject())),
            this.probe(() => {
                if (!process.env.S3_BUCKET)
                    return Promise.reject(new Error('not configured'));
                return fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
                    .then(r => { if (r.status >= 500)
                    throw new Error(String(r.status)); });
            }),
            this.probe(() => Promise.resolve(process.env.FCM_PROJECT_ID ? true : Promise.reject(new Error('not configured')))),
            this.probe(() => {
                if (!process.env.RESEND_API_KEY)
                    return Promise.reject(new Error('not configured'));
                return fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(4000) })
                    .then(r => { if (r.status === 401 || r.status >= 500)
                    throw new Error(String(r.status)); });
            }),
        ]);
        const db = this.conn.db;
        const day = 24 * 3600 * 1000;
        const [usersTotal, wsConnections, activeCalls, openOrders, openCarts, recentErrors, dbStats, medsCount, pendingReports, pendingImages,] = await Promise.all([
            this.conn.collection('users').countDocuments({}),
            Promise.resolve(global.__ws_count ?? null),
            this.conn.collection('callsessions').countDocuments({ status: { $in: ['INITIATED', 'ACTIVE'] } }),
            this.conn.collection('orders').countDocuments({ status: { $in: ['PENDING', 'CREATED', 'PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'] } }),
            this.conn.collection('carts').countDocuments({}),
            this.conn.collection('system_events').find({ type: /error|failed/i }).sort({ createdAt: -1 }).limit(10).project({ _id: 0, type: 1, createdAt: 1, meta: 1 }).toArray().catch(() => []),
            db.stats().catch(() => null),
            this.conn.collection('medicines_master').countDocuments({}),
            this.conn.collection('pharmacy_shortage_reports').countDocuments({ status: 'pending' }),
            this.conn.collection('medicine_image_suggestions').countDocuments({ status: 'pending' }),
        ]);
        let queues = null;
        try {
            const c = this.redis.getClient?.();
            if (c) {
                const keys = await c.keys('bull:*:wait');
                queues = {};
                for (const k of keys.slice(0, 10)) {
                    queues[k.replace(/^bull:|:wait$/g, '')] = await c.llen(k);
                }
            }
        }
        catch {
            queues = null;
        }
        const crons = [
            { name: 'daily-backup', schedule: '03:00 daily', status: 'scheduled' },
            { name: 'monitor', schedule: '*/15min', status: 'scheduled' },
            { name: 'hot-medicines', schedule: '04:00 daily', status: 'scheduled' },
            { name: 'appointment-reminders', schedule: 'hourly', status: 'in-app' },
            { name: 'retargeting', schedule: 'every 6h', status: 'in-app' },
            { name: 'scheduled-campaigns', schedule: 'every minute', status: 'in-app' },
            { name: 'certbot-renew', schedule: '12h', status: 'scheduled' },
        ];
        return {
            generated_at: new Date().toISOString(),
            elapsed_ms: Date.now() - t0,
            services: {
                mongodb: mongo,
                redis,
                livekit,
                coturn,
                r2: { ...r2, configured: !!process.env.S3_BUCKET, bucket: process.env.S3_BUCKET || null },
                fcm: { ...fcm, configured: !!process.env.FCM_PROJECT_ID },
                resend: { ...resend, configured: !!process.env.RESEND_API_KEY },
            },
            metrics: {
                users_total: usersTotal,
                websocket_connections: wsConnections,
                active_calls: activeCalls,
                open_orders: openOrders,
                open_carts: openCarts,
                medicines_total: medsCount,
                pending_shortage_reports: pendingReports,
                pending_image_suggestions: pendingImages,
                db_size_mb: dbStats ? Math.round((dbStats.dataSize || 0) / 1024 / 1024) : null,
                db_storage_mb: dbStats ? Math.round((dbStats.storageSize || 0) / 1024 / 1024) : null,
            },
            queues,
            crons,
            recent_errors: recentErrors,
            host_note: 'Host metrics (disk/ram/cpu/ssl/backup) are tracked by scripts/monitor.sh — see /var/log/nabdah-monitor.log on the VPS',
        };
    }
};
exports.HealthDashboardController = HealthDashboardController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthDashboardController.prototype, "dashboard", null);
exports.HealthDashboardController = HealthDashboardController = __decorate([
    (0, common_1.Controller)('admin/health-dashboard'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        redis_service_1.RedisService])
], HealthDashboardController);
//# sourceMappingURL=health-dashboard.controller.js.map