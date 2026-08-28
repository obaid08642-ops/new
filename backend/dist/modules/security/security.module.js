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
exports.SecurityModule = exports.AuditController = exports.SecurityHeadersMiddleware = exports.TracingMiddleware = exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_log_schema_1 = require("../../schemas/audit-log.schema");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const crypto_1 = require("crypto");
let AuditService = class AuditService {
    constructor(logs) {
        this.logs = logs;
    }
    async write(entry) {
        try {
            await this.logs.create(entry);
        }
        catch { }
    }
    async query(filter = {}, limit = 100) { return this.logs.find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean(); }
    async queryAdmin(options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(options.limit || 50, 500));
        const filter = {};
        if (options.role)
            filter.role = options.role;
        if (options.severity)
            filter.severity = options.severity;
        if (options.user_id)
            filter.user_id = options.user_id;
        if (options.search) {
            filter.$or = [
                { action: { $regex: options.search, $options: 'i' } },
                { resource_kind: { $regex: options.search, $options: 'i' } },
                { resource_id: { $regex: options.search, $options: 'i' } },
            ];
        }
        const total = await this.logs.countDocuments(filter);
        const logs = await this.logs.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { logs, total, page, limit };
    }
    async queryPersonal(userId, options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(options.limit || 20, 100));
        const filter = { user_id: userId };
        const total = await this.logs.countDocuments(filter);
        const logs = await this.logs.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { logs, total, page, limit };
    }
    async onRegister(p) { await this.write({ action: 'patient_register', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
    async onLogin(p) { await this.write({ action: 'patient_login', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
    async onLogout(p) { await this.write({ action: 'patient_logout', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent }); }
    async onBookingCreated(p) { await this.write({ action: 'consultation_booking', user_id: p.patient_id, role: 'patient', resource_kind: 'booking', resource_id: p.id, details: { booking_id: p.id } }); }
    async onBookingCancelled(p) { await this.write({ action: 'consultation_cancellation', user_id: p.actor_id, role: p.role, resource_kind: 'booking', resource_id: p.id }); }
    async onPaymentCompleted(p) { await this.write({ action: 'payment_completed', user_id: p.patient_id, role: 'patient', resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount } }); }
    async onUploadCompleted(p) { await this.write({ action: 'file_upload', user_id: p.user_id, role: p.role, resource_kind: 'media', resource_id: p.id, details: { mime: p.mime, size: p.size } }); }
    async onUploadRejected(p) { await this.write({ action: 'upload_rejected', user_id: p.user_id, ip: p.ip, details: { reason: p.reason, mime: p.mime, size: p.size }, severity: 'warn' }); }
    async onScheduleUpdated(p) { await this.write({ action: 'schedule_change', user_id: p.provider_id, role: 'provider' }); }
    async onCallAccepted(p) { await this.write({ action: 'consultation_accept', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
    async onCallRejected(p) { await this.write({ action: 'consultation_reject', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
    async onPrescriptionCreated(p) { await this.write({ action: 'prescription_create', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
    async onPrescriptionUpdated(p) { await this.write({ action: 'prescription_edit', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
    async onProviderProfileUpdated(p) { await this.write({ action: 'profile_edit', user_id: p.provider_id, role: 'provider' }); }
    async onAdminUserUpdated(p) { await this.write({ action: 'user_modify', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, severity: 'warn' }); }
    async onAdminProviderApproved(p) { await this.write({ action: 'provider_approve', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
    async onAdminProviderRejected(p) { await this.write({ action: 'provider_reject', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
    async onAdminCommissionUpdated(p) { await this.write({ action: 'commission_change', user_id: p.admin_id, role: 'admin', details: { rate: p.rate }, severity: 'warn' }); }
    async onFeatureFlagUpdated(p) { await this.write({ action: 'flag_change', user_id: p.admin_id, role: 'admin', details: { flag: p.flag, value: p.value } }); }
    async onLoginFailed(p) { await this.write({ action: 'login_failed', ip: p.ip, user_agent: p.user_agent, details: { phone: hashTail(p.phone) }, severity: 'warn' }); }
    async onRefund(p) { await this.write({ action: 'payment_refund', user_id: p.actor_id, resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount }, severity: 'warn' }); }
    async onForceCancel(p) { await this.write({ action: 'admin_force_cancel', user_id: p.actor_id, role: 'admin', resource_kind: p.kind, resource_id: p.id, severity: 'critical' }); }
    async onFinanceOpExecuted(p) { await this.write({ action: 'finance_operation_executed', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, amount: p?.payload?.amount, provider_account_id: p?.payload?.provider_account_id }, severity: 'critical' }); }
    async onFinanceOpRejected(p) { await this.write({ action: 'finance_operation_rejected', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, note: p.note }, severity: 'warn' }); }
    async onInsuranceDecided(p) { await this.write({ action: 'insurance_decision', resource_kind: 'insurance_request', resource_id: p.request_id, details: { state: p.state, copay_amount: p.copay_amount, patient_id: p.patient_id }, severity: 'warn' }); }
    async onMedicalReportCreated(p) { await this.write({ action: 'medical_report_created', resource_kind: 'medical_report', resource_id: p.id, details: { patient_id: p.patient_id, critical: !!p.critical, tracking_id: p.tracking_id }, severity: p.critical ? 'critical' : 'info' }); }
    async onLabReportUploaded(p) { await this.write({ action: 'lab_report_uploaded', resource_kind: 'lab_booking', resource_id: p.booking_id, details: { report_id: p.report_id, patient_id: p.patient_id }, severity: 'warn' }); }
    async onRadiologyReportPublished(p) { await this.write({ action: 'radiology_report_published', resource_kind: 'radiology_booking', resource_id: p.bookingId || p.booking_id, details: { patient_id: p.patientId || p.patient_id }, severity: 'warn' }); }
    async onUserDeleted(p) { await this.write({ action: 'user_deleted', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, details: { target_role: p.role, phone_tail: p.phone_tail }, severity: 'critical' }); }
};
exports.AuditService = AuditService;
__decorate([
    (0, event_emitter_1.OnEvent)('auth.register'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onRegister", null);
__decorate([
    (0, event_emitter_1.OnEvent)('auth.login'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onLogin", null);
__decorate([
    (0, event_emitter_1.OnEvent)('auth.logout'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onLogout", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onBookingCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onPaymentCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('upload.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onUploadCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('upload.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onUploadRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('provider.schedule_updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onScheduleUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.accepted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onCallAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onCallRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('prescription.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onPrescriptionCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('prescription.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onPrescriptionUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('provider.profile_updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onProviderProfileUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.user_updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onAdminUserUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.provider_approved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onAdminProviderApproved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.provider_rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onAdminProviderRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.commission_updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onAdminCommissionUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('feature_flag.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onFeatureFlagUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('auth.login_failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onLoginFailed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.refund'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onRefund", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.force_cancel'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onForceCancel", null);
__decorate([
    (0, event_emitter_1.OnEvent)('finance.operation.executed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onFinanceOpExecuted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('finance.operation.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onFinanceOpRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('insurance.decided'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onInsuranceDecided", null);
__decorate([
    (0, event_emitter_1.OnEvent)('medical_report.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onMedicalReportCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('lab.report_uploaded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onLabReportUploaded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.report_published'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onRadiologyReportPublished", null);
__decorate([
    (0, event_emitter_1.OnEvent)('admin.user_deleted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditService.prototype, "onUserDeleted", null);
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('AuditLog')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AuditService);
function hashTail(s) { if (!s)
    return null; return (0, crypto_1.createHash)('sha256').update(s).digest('hex').slice(0, 12); }
let TracingMiddleware = class TracingMiddleware {
    use(req, res, next) {
        const id = req.headers['x-correlation-id'] || (0, crypto_1.randomUUID)();
        req.correlation_id = id;
        res.setHeader('x-correlation-id', id);
        const start = Date.now();
        res.on('finish', () => {
            const ms = Date.now() - start;
            if (ms > 1500 || res.statusCode >= 500) {
                console.warn(`[slow_or_err] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms cid=${id}`);
            }
        });
        next();
    }
};
exports.TracingMiddleware = TracingMiddleware;
exports.TracingMiddleware = TracingMiddleware = __decorate([
    (0, common_1.Injectable)()
], TracingMiddleware);
let SecurityHeadersMiddleware = class SecurityHeadersMiddleware {
    use(req, res, next) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-DNS-Prefetch-Control', 'off');
        res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        next();
    }
};
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware;
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware = __decorate([
    (0, common_1.Injectable)()
], SecurityHeadersMiddleware);
let AuditController = class AuditController {
    constructor(svc) {
        this.svc = svc;
    }
    async admin(search, role, severity, userId, page = 1, limit = 50) {
        return this.svc.queryAdmin({ search, role, severity, user_id: userId, page: +page, limit: +limit });
    }
    async myActivity(u, page = 1, limit = 20) {
        return this.svc.queryPersonal(u.id, { page: +page, limit: +limit });
    }
    recent() { return this.svc.query({}, 200); }
    critical() { return this.svc.query({ severity: 'critical' }, 100); }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('severity')),
    __param(3, (0, common_1.Query)('user_id')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "admin", null);
__decorate([
    (0, common_1.Get)('my-activity'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "myActivity", null);
__decorate([
    (0, common_1.Get)('recent'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "recent", null);
__decorate([
    (0, common_1.Get)('critical'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "critical", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('security/audit'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [AuditService])
], AuditController);
let SecurityModule = class SecurityModule {
    configure(consumer) {
        consumer.apply(TracingMiddleware, SecurityHeadersMiddleware).forRoutes('*');
    }
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: 'AuditLog', schema: audit_log_schema_1.AuditLogSchema }])],
        controllers: [AuditController],
        providers: [AuditService, TracingMiddleware, SecurityHeadersMiddleware],
        exports: [AuditService, TracingMiddleware, SecurityHeadersMiddleware],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map