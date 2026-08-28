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
exports.LegacyModule = exports.LegacyController = exports.LegacyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const LEGACY_MAP = {
    pharmacy_orders: { canonical: 'orders', reason: 'broadcast engine pharmacy_orders runs alongside legacy orders; mapped via STATE_MAP.pharmacy' },
    pharmacy_allocations: { canonical: 'orders.state', reason: 'allocation events surface in order.state_history via WorkflowEngine' },
    pharmacy_broadcasts: { canonical: 'system_events', reason: 'broadcast lifecycle mirrored in service.* events' },
    provideraccountprofiles: { canonical: 'providerprofiles', reason: 'duplicate provider profile schema in /provider module' },
    provideraccounts: { canonical: 'users (with role=provider)', reason: 'duplicate of auth user accounts' },
};
let LegacyService = class LegacyService {
    constructor(conn) {
        this.conn = conn;
    }
    async report() {
        const db = this.conn.db;
        if (!db)
            return { error: 'no_db_connection' };
        const cols = await db.listCollections().toArray();
        const out = [];
        for (const c of cols) {
            const name = c.name;
            const count = await db.collection(name).estimatedDocumentCount().catch(() => 0);
            const legacy = LEGACY_MAP[name];
            out.push({
                collection: name,
                document_count: count,
                is_legacy: !!legacy,
                canonical: legacy?.canonical || null,
                reason: legacy?.reason || null,
            });
        }
        return {
            collections: out.sort((a, b) => Number(b.is_legacy) - Number(a.is_legacy) || b.document_count - a.document_count),
            legacy_total: out.filter(x => x.is_legacy).length,
            canonical_total: out.filter(x => !x.is_legacy).length,
            generated_at: new Date(),
        };
    }
    async usageMap() {
        return {
            pharmacy_orders: {
                canonical: 'orders',
                readers: ['unified-bookings.myTimeline', 'admin-command-center.liveBookings'],
                writers: ['pharmacy/services/pharmacy-order.service.ts', 'pharmacy/services/pharmacy-allocation.service.ts'],
                status: 'parallel_coexistence — engine bridges both via STATE_MAP',
            },
            pharmacy_allocations: {
                canonical: 'orders.state_history (via engine)',
                readers: ['pharmacy/services/pharmacy-allocation.service.ts'],
                writers: ['pharmacy/services/pharmacy-allocation.service.ts'],
                status: 'side_table — kept for granular split tracking',
            },
            pharmacy_broadcasts: {
                canonical: 'system_events (service.*)',
                readers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
                writers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
                status: 'side_table — kept for radius/round tracking',
            },
            provideraccountprofiles: {
                canonical: 'providerprofiles',
                readers: ['provider/services/*'],
                writers: ['provider/services/*'],
                status: 'duplicate_schema — slated for merge',
            },
        };
    }
};
exports.LegacyService = LegacyService;
exports.LegacyService = LegacyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], LegacyService);
let LegacyController = class LegacyController {
    constructor(svc) {
        this.svc = svc;
    }
    report() { return this.svc.report(); }
    usageMap() { return this.svc.usageMap(); }
};
exports.LegacyController = LegacyController;
__decorate([
    (0, common_1.Get)('report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegacyController.prototype, "report", null);
__decorate([
    (0, common_1.Get)('usage-map'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegacyController.prototype, "usageMap", null);
exports.LegacyController = LegacyController = __decorate([
    (0, common_1.Controller)('legacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [LegacyService])
], LegacyController);
let LegacyModule = class LegacyModule {
};
exports.LegacyModule = LegacyModule;
exports.LegacyModule = LegacyModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([])],
        controllers: [LegacyController],
        providers: [LegacyService],
    })
], LegacyModule);
//# sourceMappingURL=legacy.module.js.map