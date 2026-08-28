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
exports.AdminAuditService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
let AdminAuditService = class AdminAuditService {
    constructor(conn, bus) {
        this.conn = conn;
        this.bus = bus;
        this.logger = new common_1.Logger('AdminAudit');
    }
    async write(entry) {
        const doc = {
            id: (0, uuid_1.v4)(),
            action: entry.action,
            admin_id: entry.actor?.id || 'unknown',
            admin_name: entry.actor?.full_name || entry.actor?.email || null,
            admin_role: entry.actor?.role || null,
            target_type: entry.target_type,
            target_id: entry.target_id,
            reason: entry.reason ?? null,
            before: entry.before ?? null,
            after: entry.after ?? null,
            meta: entry.meta ?? null,
            ip: entry.ip ?? null,
            user_agent: entry.user_agent ?? null,
            createdAt: new Date(),
        };
        try {
            await this.conn.collection('admin_actions_log').insertOne(doc);
        }
        catch (e) {
            this.logger.error(`audit_write_failed action=${entry.action} err=${e?.message}`);
        }
        try {
            this.bus?.emit({
                type: `admin.${entry.action}`,
                entity_type: entry.target_type,
                entity_id: entry.target_id,
                actor_account_id: doc.admin_id,
                actor_role: doc.admin_role || 'admin',
                reason_code: doc.reason,
                before: doc.before,
                after: doc.after,
            });
        }
        catch {
        }
    }
    async list(filter, page = 1, limit = 50) {
        const q = {};
        if (filter.action)
            q.action = filter.action;
        if (filter.admin_id)
            q.admin_id = filter.admin_id;
        if (filter.target_type)
            q.target_type = filter.target_type;
        if (filter.target_id)
            q.target_id = filter.target_id;
        const range = {};
        if (filter.from)
            range.$gte = new Date(filter.from);
        if (filter.to)
            range.$lte = new Date(filter.to);
        if (Object.keys(range).length)
            q.createdAt = range;
        const col = this.conn.collection('admin_actions_log');
        const p = Math.max(1, page);
        const l = Math.min(200, Math.max(1, limit));
        const [items, total] = await Promise.all([
            col.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).toArray(),
            col.countDocuments(q),
        ]);
        return { data: items.map(({ _id, ...rest }) => rest), total, page: p, pages: Math.ceil(total / l) };
    }
};
exports.AdminAuditService = AdminAuditService;
exports.AdminAuditService = AdminAuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], AdminAuditService);
//# sourceMappingURL=audit.service.js.map