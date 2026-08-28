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
exports.AdminSegmentsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
const segments_engine_1 = require("./segments.engine");
let AdminSegmentsController = class AdminSegmentsController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    fields() {
        return { allowed_fields: segments_engine_1.SEGMENT_ALLOWED_FIELDS };
    }
    async list() {
        const docs = await this.conn.collection('segments').find({}).sort({ updatedAt: -1 }).limit(200).toArray();
        const out = [];
        for (const d of docs) {
            const { _id, ...clean } = d;
            try {
                clean.count_current = await this.conn.collection('users').countDocuments((0, segments_engine_1.compileSegment)(d.definition));
            }
            catch {
                clean.count_current = null;
            }
            out.push(clean);
        }
        return out;
    }
    async preview(b) {
        let filter;
        try {
            filter = (0, segments_engine_1.compileSegment)(b?.definition);
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message || 'invalid_segment');
        }
        const [count, sample] = await Promise.all([
            this.conn.collection('users').countDocuments(filter),
            this.conn.collection('users').find(filter).limit(10)
                .project({ _id: 0, id: 1, full_name: 1, phone: 1, city: 1 })
                .toArray(),
        ]);
        return { count, sample, compiled_filter: filter };
    }
    async create(b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw e;
            throw e;
        }
        let filter;
        try {
            filter = (0, segments_engine_1.compileSegment)(b?.definition);
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message || 'invalid_segment');
        }
        const doc = {
            id: `seg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            name_ar: String(b?.name_ar || '').trim() || 'شريحة بدون اسم',
            description_ar: String(b?.description_ar || '').trim() || null,
            definition: b.definition,
            count_at_creation: await this.conn.collection('users').countDocuments(filter),
            created_by: me.id,
            createdAt: new Date(), updatedAt: new Date(),
        };
        await this.conn.collection('segments').insertOne(doc);
        await this.audit.write({
            action: 'segment_create', actor: me, target_type: 'segment', target_id: doc.id,
            reason, after: { name_ar: doc.name_ar, rules: doc.definition?.rules?.length },
        });
        const { _id, ...clean } = doc;
        return clean;
    }
    async remove(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw e;
            throw e;
        }
        const before = await this.conn.collection('segments').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('segment_not_found');
        await this.conn.collection('segments').deleteOne({ id });
        await this.audit.write({
            action: 'segment_delete', actor: me, target_type: 'segment', target_id: id,
            reason, before: { name_ar: before.name_ar },
        });
        return { ok: true };
    }
    async members(id, page = '1', limit = '25') {
        const seg = await this.conn.collection('segments').findOne({ id });
        if (!seg)
            throw new common_1.NotFoundException('segment_not_found');
        let filter;
        try {
            filter = (0, segments_engine_1.compileSegment)(seg.definition);
        }
        catch (e) {
            throw new common_1.BadRequestException(`segment_no_longer_compilable:${e?.message}`);
        }
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, parseInt(limit, 10) || 25);
        const col = this.conn.collection('users');
        const [items, total] = await Promise.all([
            col.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
                .project({ _id: 0, id: 1, full_name: 1, phone: 1, email: 1, city: 1, createdAt: 1 })
                .toArray(),
            col.countDocuments(filter),
        ]);
        return { segment: { id: seg.id, name_ar: seg.name_ar }, data: items, total, page: p, pages: Math.ceil(total / l) };
    }
};
exports.AdminSegmentsController = AdminSegmentsController;
__decorate([
    (0, common_1.Get)('fields'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CRM_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSegmentsController.prototype, "fields", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CRM_READ),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSegmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CRM_READ),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminSegmentsController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSegmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSegmentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CRM_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSegmentsController.prototype, "members", null);
exports.AdminSegmentsController = AdminSegmentsController = __decorate([
    (0, common_1.Controller)('admin/segments'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminSegmentsController);
//# sourceMappingURL=admin-segments.controller.js.map