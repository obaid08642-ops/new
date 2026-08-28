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
exports.OpsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const redis_service_1 = require("../redis/redis.service");
let OpsController = class OpsController {
    constructor(conn, redis) {
        this.conn = conn;
        this.redis = redis;
    }
    client() { return this.redis.getClient?.(); }
    async scanKeys(pattern) {
        const client = this.client();
        if (!client)
            return [];
        const out = [];
        let cursor = '0';
        do {
            const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
            cursor = next;
            out.push(...keys);
        } while (cursor !== '0' && out.length < 10000);
        return out;
    }
    async overview() {
        const day = new Date().toISOString().slice(0, 10);
        const client = this.client();
        const [presenceKeys, adminSessionKeys] = await Promise.all([
            this.scanKeys('presence:*'),
            this.scanKeys('sessions:*'),
        ]);
        const onlineUsers = presenceKeys.filter(k => !k.startsWith('presence:devices:')).length;
        let reqByPath = {};
        let statusByPath = {};
        if (client) {
            [reqByPath, statusByPath] = await Promise.all([
                client.hgetall(`ops:req:${day}`),
                client.hgetall(`ops:status:${day}`),
            ]);
        }
        const tot = (prefix) => Object.entries(statusByPath)
            .filter(([k]) => k === prefix).reduce((a, [, v]) => a + Number(v), 0);
        const ok = tot('2xx'), bad4 = tot('4xx'), bad5 = tot('5xx');
        const total = ok + bad4 + bad5;
        const topEndpoints = Object.entries(reqByPath)
            .sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 15)
            .map(([path, count]) => ({ path, count: Number(count) }));
        const topFailing = Object.entries(statusByPath)
            .filter(([k]) => k.startsWith('4xx:') || k.startsWith('5xx:'))
            .map(([k, v]) => ({ path: k.slice(4), class: k.slice(0, 3), count: Number(v) }))
            .sort((a, b) => b.count - a.count).slice(0, 10);
        const sinceToday = new Date(`${day}T00:00:00.000Z`);
        const lateBefore = new Date(Date.now() - 24 * 3600 * 1000);
        const group = async (coll, pendingStates) => {
            try {
                const c = this.conn.collection(coll);
                const [byStatus, today, late] = await Promise.all([
                    c.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray(),
                    c.countDocuments({ createdAt: { $gte: sinceToday } }),
                    c.countDocuments({ status: { $in: pendingStates }, createdAt: { $lt: lateBefore } }),
                ]);
                const m = {};
                byStatus.forEach((r) => { m[String(r._id)] = r.n; });
                return { by_status: m, created_today: today, late: late };
            }
            catch {
                return { by_status: {}, created_today: 0, late: 0 };
            }
        };
        const [orders, appointments, emergency, procurement, pharmacyOrders] = await Promise.all([
            group('orders', ['pending', 'processing', 'created', 'PENDING']),
            group('appointments', ['PENDING', 'pending', 'CONFIRMED']),
            group('emergency_requests', ['pending', 'PENDING', 'dispatched', 'accepted']),
            group('procurementrequests', ['PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED']),
            group('pharmacyorders', ['pending', 'PENDING', 'processing']),
        ]);
        let activity = [];
        try {
            activity = await this.conn.collection('system_events')
                .find({}, { projection: { type: 1, actor_account_id: 1, actor_role: 1, entity_type: 1, entity_id: 1, createdAt: 1 } })
                .sort({ createdAt: -1 }).limit(30).toArray();
        }
        catch { }
        return {
            generated_at: new Date().toISOString(),
            online: { users: onlineUsers, admin_sessions: adminSessionKeys.length },
            today: {
                total_requests: total, success: ok, client_errors: bad4, server_errors: bad5,
                success_rate: total ? Math.round((ok / total) * 1000) / 10 : null,
            },
            top_endpoints: topEndpoints,
            top_failing: topFailing,
            pipelines: { orders, appointments, emergency, procurement, pharmacy_orders: pharmacyOrders },
            recent_activity: activity,
        };
    }
    async requests(kind, limit) {
        const lim = Math.min(Math.max(parseInt(limit || '30') || 30, 1), 100);
        const lateBefore = new Date(Date.now() - 24 * 3600 * 1000);
        const norm = (doc, k, label, pendingStates, doneStates, failStates) => {
            const st = String(doc.status || 'unknown');
            let normalized = 'pending';
            if (doneStates.includes(st))
                normalized = 'done';
            else if (failStates.includes(st))
                normalized = 'failed';
            else if (pendingStates.includes(st) && doc.createdAt && new Date(doc.createdAt) < lateBefore)
                normalized = 'late';
            return {
                kind: k, kind_label: label, id: String(doc._id),
                status: st, normalized_status: normalized,
                created_by: doc.patient_id || doc.user_id || doc.pharmacy_id || doc.created_by || null,
                created_at: doc.createdAt || null, updated_at: doc.updatedAt || null,
                summary: doc.full_name || doc.patient_name || doc.name_ar || doc.title || doc.service_name || null,
            };
        };
        const fetch = async (coll, k, label, p, d, f) => {
            try {
                const rows = await this.conn.collection(coll).find({}).sort({ createdAt: -1 }).limit(lim).toArray();
                return rows.map(r => norm(r, k, label, p, d, f));
            }
            catch {
                return [];
            }
        };
        const groups = {
            orders: () => fetch('orders', 'orders', 'طلبات الصيدلية', ['pending', 'processing', 'created'], ['delivered', 'completed', 'DELIVERED'], ['cancelled', 'CANCELLED', 'failed']),
            appointments: () => fetch('appointments', 'appointments', 'المواعيد', ['PENDING', 'CONFIRMED', 'pending'], ['COMPLETED', 'completed'], ['CANCELLED', 'cancelled', 'NO_SHOW']),
            emergency: () => fetch('emergency_requests', 'emergency', 'الطوارئ SOS', ['pending', 'dispatched', 'accepted'], ['completed', 'resolved', 'arrived'], ['cancelled', 'false_alarm']),
            procurement: () => fetch('procurementrequests', 'procurement', 'طلبات المستودعات', ['PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED'], ['COMPLETED', 'APPROVED_BY_PHARMACY'], ['CANCELLED']),
        };
        const keys = kind && groups[kind] ? [kind] : Object.keys(groups);
        const parts = await Promise.all(keys.map(k => groups[k]()));
        const all = parts.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, lim);
        return { data: all, counts: {
                total: all.length,
                pending: all.filter(r => r.normalized_status === 'pending').length,
                late: all.filter(r => r.normalized_status === 'late').length,
                done: all.filter(r => r.normalized_status === 'done').length,
                failed: all.filter(r => r.normalized_status === 'failed').length,
            } };
    }
    async traffic(date) {
        const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : new Date().toISOString().slice(0, 10);
        const client = this.client();
        if (!client)
            return { date: day, by_path: {}, by_status: {} };
        const [by_path, by_status] = await Promise.all([
            client.hgetall(`ops:req:${day}`),
            client.hgetall(`ops:status:${day}`),
        ]);
        return { date: day, by_path, by_status };
    }
};
exports.OpsController = OpsController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OpsController.prototype, "requests", null);
__decorate([
    (0, common_1.Get)('traffic'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OpsController.prototype, "traffic", null);
exports.OpsController = OpsController = __decorate([
    (0, common_1.Controller)('admin/ops'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        redis_service_1.RedisService])
], OpsController);
//# sourceMappingURL=ops.controller.js.map