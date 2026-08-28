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
exports.MedicalReportsController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const medical_reports_service_1 = require("./medical-reports.service");
const auth_guard_2 = require("../../common/auth.guard");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let MedicalReportsController = class MedicalReportsController {
    constructor(svc, conn) {
        this.svc = svc;
        this.conn = conn;
    }
    async timeline(user) {
        const pid = user.id;
        const [appts, labs, rads, rxs, vitals] = await Promise.all([
            this.conn.collection('appointments').find({ patient_id: pid }, { projection: { _id: 0, id: 1, doctor_name: 1, type: 1, scheduled_at: 1, state: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
            this.conn.collection('labbookings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, status: 1, createdAt: 1, scheduled_at: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
            this.conn.collection('radiologybookings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, status: 1, createdAt: 1, scheduled_at: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
            this.conn.collection('prescriptions').find({ patient_id: pid }, { projection: { _id: 0, id: 1, state: 1, status: 1, createdAt: 1, doctor_name: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
            this.conn.collection('vitalreadings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, type: 1, value: 1, unit: 1, measured_at: 1 } }).sort({ measured_at: -1 }).limit(50).toArray().catch(() => []),
        ]);
        const events = [];
        for (const a of appts)
            events.push({ id: a.id, type: 'appointment', title: a.doctor_name ? `موعد — ${a.doctor_name}` : 'موعد طبي', date: a.scheduled_at || a.createdAt, status: a.state || a.status });
        for (const l of labs)
            events.push({ id: l.id, type: 'lab', title: 'حجز تحاليل مخبرية', date: l.scheduled_at || l.createdAt, status: l.status });
        for (const r of rads)
            events.push({ id: r.id, type: 'lab', title: 'حجز أشعة', date: r.scheduled_at || r.createdAt, status: r.status, kind: 'radiology' });
        for (const x of rxs)
            events.push({ id: x.id, type: 'prescription', title: x.doctor_name ? `وصفة — ${x.doctor_name}` : 'وصفة طبية', date: x.createdAt, status: x.state || x.status });
        for (const v of vitals)
            events.push({ id: v.id, type: 'vitals', title: `قياس ${v.type}: ${v.value} ${v.unit || ''}`.trim(), date: v.measured_at, status: 'recorded' });
        events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        return events;
    }
    mine(user, type, q, limit) {
        return this.svc.list(user, { type, q, limit: limit ? parseInt(limit, 10) : undefined });
    }
    track(user, tracking) {
        return this.svc.byTracking(tracking, user);
    }
    one(user, id) { return this.svc.one(user, id); }
    create(user, body) { return this.svc.create(user, body); }
};
exports.MedicalReportsController = MedicalReportsController;
__decorate([
    (0, common_2.Get)('timeline'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MedicalReportsController.prototype, "timeline", null);
__decorate([
    (0, common_2.Get)('mine'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('type')),
    __param(2, (0, common_2.Query)('q')),
    __param(3, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicalReportsController.prototype, "mine", null);
__decorate([
    (0, common_2.Get)('track/:trackingId'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('trackingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalReportsController.prototype, "track", null);
__decorate([
    (0, common_2.Get)(':id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalReportsController.prototype, "one", null);
__decorate([
    (0, common_2.Post)(),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalReportsController.prototype, "create", null);
exports.MedicalReportsController = MedicalReportsController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('medical-reports'),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [medical_reports_service_1.MedicalReportsService, mongoose_2.Connection])
], MedicalReportsController);
//# sourceMappingURL=medical-reports.controller.js.map