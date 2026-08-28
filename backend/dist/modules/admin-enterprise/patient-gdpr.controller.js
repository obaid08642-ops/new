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
exports.PatientGdprController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
let PatientGdprController = class PatientGdprController {
    constructor(conn) {
        this.conn = conn;
    }
    async myRequests(me) {
        const rows = await this.conn.collection('gdpr_requests')
            .find({ user_id: me.id })
            .sort({ createdAt: -1 }).limit(20)
            .project({ _id: 0, id: 1, type: 1, status: 1, createdAt: 1, completed_at: 1, result_ref: 1 })
            .toArray();
        return { data: rows };
    }
    async createRequest(b, me) {
        const type = String(b?.type || '');
        if (!['export', 'delete'].includes(type))
            throw new common_1.BadRequestException('invalid_type');
        const open = await this.conn.collection('gdpr_requests').findOne({
            user_id: me.id, type, status: { $in: ['requested', 'processing'] },
        });
        if (open)
            return { ok: true, existing: true, id: open.id, status: open.status };
        const doc = {
            id: `gdpr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            user_id: me.id, type, status: 'requested',
            requested_by: `self:${me.id}`,
            result_ref: null, createdAt: new Date(), updatedAt: new Date(),
        };
        await this.conn.collection('gdpr_requests').insertOne(doc);
        const { _id, ...clean } = doc;
        return { ok: true, ...clean };
    }
    async fetchExport(me) {
        const req = await this.conn.collection('gdpr_requests').findOne({ user_id: me.id, type: 'export', status: 'completed' }, { sort: { completed_at: -1 } });
        if (!req?.result_ref)
            throw new common_1.NotFoundException('no_completed_export');
        const pkg = await this.conn.collection('gdpr_exports').findOne({ request_id: req.id });
        if (!pkg?.payload)
            throw new common_1.NotFoundException('export_package_missing');
        const payload = JSON.parse(JSON.stringify(pkg.payload));
        delete payload.collections.user?.anonymized_at;
        return payload;
    }
};
exports.PatientGdprController = PatientGdprController;
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientGdprController.prototype, "myRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PatientGdprController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Post)('exports/fetch'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientGdprController.prototype, "fetchExport", null);
exports.PatientGdprController = PatientGdprController = __decorate([
    (0, common_1.Controller)('privacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], PatientGdprController);
//# sourceMappingURL=patient-gdpr.controller.js.map