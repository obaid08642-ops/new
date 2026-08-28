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
exports.AdminCommandCenterV2Controller = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const rxjs_1 = require("rxjs");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
let AdminCommandCenterV2Controller = class AdminCommandCenterV2Controller {
    constructor(conn) {
        this.conn = conn;
    }
    async snapshot() {
        const db = this.conn.db;
        const now = Date.now();
        const dayAgo = new Date(now - 86_400_000);
        const count = (col, q = {}) => db.collection(col).countDocuments(q).catch(() => 0);
        const [activeOrders, activeLabs, activeRads, activeNursing, apptsToday, openSos, unreadTickets, payments24hAgg] = await Promise.all([
            count('orders', { state: { $nin: ['CANCELLED', 'DELIVERED', 'REJECTED'] } }),
            count('labbookings', { state: { $nin: ['CANCELLED', 'REPORTED', 'SAMPLE_REJECTED'] } }),
            count('radiologybookings', { state: { $nin: ['CANCELLED', 'REPORT_PUBLISHED'] } }),
            count('homecarebookings', { state: { $nin: ['CANCELLED', 'COMPLETED', 'DONE', 'REJECTED'] } }),
            count('appointments', { slot_start: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(24, 0, 0, 0)) }, status: { $nin: ['CANCELLED'] } }),
            count('emergencyrequests', { status: { $in: ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'ACCEPTED'] } }).catch(() => 0),
            count('support_requests', { status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
            db.collection('moyasar_payments').aggregate([
                { $match: { status: { $in: ['paid', 'confirmed', 'succeeded'] }, createdAt: { $gte: dayAgo } } },
                { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
            ]).toArray().then((r) => r[0] || { total: 0, n: 0 }).catch(() => ({ total: 0, n: 0 })),
        ]);
        const slaBreached = await Promise.all([
            count('orders', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'DELIVERED'] } }),
            count('labbookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'REPORTED'] } }),
            count('radiologybookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'REPORT_PUBLISHED'] } }),
            count('homecarebookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'COMPLETED'] } }),
        ]).then((a) => a.reduce((x, y) => x + y, 0));
        return {
            ts: new Date().toISOString(),
            tiles: {
                orders_active: activeOrders,
                labs_active: activeLabs,
                radiology_active: activeRads,
                nursing_active: activeNursing,
                appointments_today: apptsToday,
                sos_open: openSos,
                tickets_open: unreadTickets,
                revenue_24h_sar: Math.round(Number(payments24hAgg.total || 0) * 100) / 100,
                payments_24h: Number(payments24hAgg.n || 0),
                sla_breach_total: slaBreached,
            },
        };
    }
    initial() {
        return this.snapshot();
    }
    stream() {
        const tiles = (0, rxjs_1.interval)(15_000).pipe((0, rxjs_1.switchMap)(() => (0, rxjs_1.from)(this.snapshot())), (0, rxjs_1.map)((snap) => ({ data: snap })));
        const hello = (0, rxjs_1.of)({ data: { type: 'connected', t: Date.now() } });
        return (0, rxjs_1.merge)(hello, tiles);
    }
};
exports.AdminCommandCenterV2Controller = AdminCommandCenterV2Controller;
__decorate([
    (0, common_1.Get)('command-center-v2'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.COMMAND_CENTER_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminCommandCenterV2Controller.prototype, "initial", null);
__decorate([
    (0, common_1.Sse)('stream'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.COMMAND_CENTER_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], AdminCommandCenterV2Controller.prototype, "stream", null);
exports.AdminCommandCenterV2Controller = AdminCommandCenterV2Controller = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], AdminCommandCenterV2Controller);
//# sourceMappingURL=command-center-v2.controller.js.map