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
exports.AdminMatchingController = exports.ProviderScoreController = exports.ProviderScheduleSlotsController = exports.ProviderZonesController = exports.ProviderCapabilitiesController = exports.ProviderDashboardController = exports.ProviderScheduleController = exports.ProviderNotificationsController = exports.ProviderWalletController = exports.ProviderRequestsController = exports.ProviderAdminController = exports.ProviderOperatorsController = exports.ProviderProfileController = exports.ProviderAuthController = void 0;
const common_1 = require("@nestjs/common");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const provider_auth_service_1 = require("./services/provider-auth.service");
const provider_profile_service_1 = require("./services/provider-profile.service");
const provider_operators_service_1 = require("./services/provider-operators.service");
const provider_admin_service_1 = require("./services/provider-admin.service");
const provider_request_engine_service_1 = require("./services/provider-request-engine.service");
const provider_notifications_service_1 = require("./services/provider-notifications.service");
const provider_schedule_service_1 = require("./services/provider-schedule.service");
const provider_dashboard_service_1 = require("./services/provider-dashboard.service");
const provider_seed_service_1 = require("./services/provider-seed.service");
const service_capability_service_1 = require("./services/service-capability.service");
const scheduling_engine_service_1 = require("./services/scheduling-engine.service");
const provider_scoring_service_1 = require("./services/provider-scoring.service");
const provider_matching_service_1 = require("./services/provider-matching.service");
const assignment_strategy_service_1 = require("./services/assignment-strategy.service");
const provider_image_processor_service_1 = require("./services/provider-image-processor.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const schemas_1 = require("./schemas");
function meta(req) { return { ip: req?.ip || req?.headers?.['x-forwarded-for'], ua: req?.headers?.['user-agent'] }; }
let ProviderAuthController = class ProviderAuthController {
    constructor(svc) {
        this.svc = svc;
    }
    register(body, req) { return this.svc.register({ ...body, meta: meta(req) }); }
    login(body, req) { return this.svc.login({ ...body, meta: meta(req) }); }
    refresh(body, req) { return this.svc.refresh({ ...body, meta: meta(req) }); }
    logout(body, req) { return this.svc.logout({ ...body, meta: meta(req) }); }
    sendOtp(body, req) {
        const purpose = body.purpose || schemas_1.OtpPurpose.EMAIL_VERIFICATION;
        return this.svc.sendOtp({ email: body.email, purpose, meta: meta(req) });
    }
    verifyEmail(body, req) { return this.svc.verifyEmail({ email: body.email, code: body.code, meta: meta(req) }); }
    forgot(body, req) { return this.svc.forgotPassword({ email: body.email, meta: meta(req) }); }
    verifyResetCode(body, req) { return this.svc.verifyResetCode({ email: body.email, code: body.code, meta: meta(req) }); }
    reset(body, req) { return this.svc.resetPassword({ email: body.email, code: body.code, new_password: body.new_password, meta: meta(req) }); }
    me(user) { return this.svc.me(user); }
};
exports.ProviderAuthController = ProviderAuthController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "register", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "login", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "logout", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "sendOtp", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "verifyEmail", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "forgot", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('verify-reset-code'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "verifyResetCode", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "reset", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderAuthController.prototype, "me", null);
exports.ProviderAuthController = ProviderAuthController = __decorate([
    (0, common_1.Controller)('provider/auth'),
    __metadata("design:paramtypes", [provider_auth_service_1.ProviderAuthService])
], ProviderAuthController);
let ProviderProfileController = class ProviderProfileController {
    constructor(svc, processor) {
        this.svc = svc;
        this.processor = processor;
    }
    get(u) { return this.svc.getProfile(u); }
    update(u, body) { return this.svc.updateProfile(u, body); }
    addPhone(u, body) { return this.svc.addPhone(u, body); }
    removePhone(u, pid) { return this.svc.removePhone(u, pid); }
    uploadDoc(u, body) { return this.svc.uploadDocument(u, body); }
    listDocs(u) { return this.svc.listDocuments(u); }
    directory() { return this.svc.directory(); }
    upsertBank(u, body) { return this.svc.upsertBank(u, body); }
    getBank(u) { return this.svc.getBank(u); }
    banks() { return this.svc.banks_list(); }
    async uploadProfileImage(user, body) {
        return this.processor.enqueueJob({
            owner_id: user.id,
            owner_type: user.role === 'nurse' ? 'nurse' : 'doctor',
            data_base64: body.data_base64,
            mime: body.mime,
            original_name: body.original_name,
        });
    }
    async getProfileImageStatus(user) {
        return this.processor.getStatus(user.id);
    }
    submit(u) { return this.svc.submitForApproval(u); }
    async submitDelta(u, body) {
        return this.svc.submitDelta(u, body);
    }
};
exports.ProviderProfileController = ProviderProfileController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('profile/phones'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "addPhone", null);
__decorate([
    (0, common_1.Delete)('profile/phones/:phone_id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "removePhone", null);
__decorate([
    (0, common_1.Post)('kyc/documents'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "uploadDoc", null);
__decorate([
    (0, common_1.Get)('kyc/documents'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "listDocs", null);
__decorate([
    (0, common_1.Get)('directory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "directory", null);
__decorate([
    (0, common_1.Post)('bank-account'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "upsertBank", null);
__decorate([
    (0, common_1.Get)('bank-account'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "getBank", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('banks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "banks", null);
__decorate([
    (0, common_1.Post)('profile/image/upload'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderProfileController.prototype, "uploadProfileImage", null);
__decorate([
    (0, common_1.Get)('profile/image/status'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderProfileController.prototype, "getProfileImageStatus", null);
__decorate([
    (0, common_1.Post)('onboarding/submit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderProfileController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('settings/delta'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderProfileController.prototype, "submitDelta", null);
exports.ProviderProfileController = ProviderProfileController = __decorate([
    (0, common_1.Controller)('provider'),
    __metadata("design:paramtypes", [provider_profile_service_1.ProviderProfileService,
        provider_image_processor_service_1.ProviderImageProcessorService])
], ProviderProfileController);
let ProviderOperatorsController = class ProviderOperatorsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u) { return this.svc.list(u); }
    invite(u, body) { return this.svc.invite(u, body); }
    accept(body) { return this.svc.acceptInvite(body); }
    update(u, id, body) { return this.svc.update(u, id, body); }
    disable(u, id, body) { return this.svc.disable(u, id, body?.reason); }
    enable(u, id) { return this.svc.enable(u, id); }
    revoke(u, id) { return this.svc.revoke(u, id); }
};
exports.ProviderOperatorsController = ProviderOperatorsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('invite'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "invite", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('accept-invite'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "accept", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/disable'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "disable", null);
__decorate([
    (0, common_1.Post)(':id/enable'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "enable", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderOperatorsController.prototype, "revoke", null);
exports.ProviderOperatorsController = ProviderOperatorsController = __decorate([
    (0, common_1.Controller)('provider/operators'),
    __metadata("design:paramtypes", [provider_operators_service_1.ProviderOperatorsService])
], ProviderOperatorsController);
let ProviderAdminController = class ProviderAdminController {
    constructor(svc, processor) {
        this.svc = svc;
        this.processor = processor;
    }
    list(u, q) { return this.svc.list(u, q); }
    byUser(u, userId) { return this.svc.detailByUser(u, userId); }
    detail(u, id) { return this.svc.detail(u, id); }
    approve(u, id, body) { return this.svc.approve(u, id, body); }
    reject(u, id, body) { return this.svc.reject(u, id, body); }
    async reprocessImage(id) {
        return this.processor.reprocessImage(id);
    }
    async replaceImage(id, body) {
        return this.processor.replaceImage(id, body.data_base64, body.mime);
    }
    async retryFailedJobs(id) {
        return this.processor.retryFailedJobs(id);
    }
    async getImageLogs(id) {
        return this.processor.getImageLogs(id);
    }
    needsChanges(u, id, body) { return this.svc.requestChanges(u, id, body); }
    suspend(u, id, body) { return this.svc.suspend(u, id, body); }
};
exports.ProviderAdminController = ProviderAdminController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('by-user/:userId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "byUser", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/reprocess-image'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderAdminController.prototype, "reprocessImage", null);
__decorate([
    (0, common_1.Post)(':id/replace-image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProviderAdminController.prototype, "replaceImage", null);
__decorate([
    (0, common_1.Post)(':id/retry-image-jobs'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderAdminController.prototype, "retryFailedJobs", null);
__decorate([
    (0, common_1.Get)(':id/image-logs'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderAdminController.prototype, "getImageLogs", null);
__decorate([
    (0, common_1.Post)(':id/request-changes'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "needsChanges", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderAdminController.prototype, "suspend", null);
exports.ProviderAdminController = ProviderAdminController = __decorate([
    (0, common_1.Controller)('admin/providers'),
    __metadata("design:paramtypes", [provider_admin_service_1.ProviderAdminService,
        provider_image_processor_service_1.ProviderImageProcessorService])
], ProviderAdminController);
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../../common/tracking");
const common_2 = require("@nestjs/common");
let ProviderRequestsController = class ProviderRequestsController {
    constructor(svc, reqRepo, events, conn) {
        this.svc = svc;
        this.reqRepo = reqRepo;
        this.events = events;
        this.conn = conn;
    }
    list(u, q) { return this.svc.list(u, q); }
    detail(u, id) { return this.svc.detail(u, id); }
    accept(u, id, body) { return this.svc.accept(u, id, body || {}); }
    reject(u, id, body) { return this.svc.reject(u, id, body || {}); }
    start(u, id, body) { return this.svc.start(u, id, body || {}); }
    complete(u, id, body) { return this.svc.complete(u, id, body || {}); }
    cancel(u, id, body) { return this.svc.cancel(u, id, body || {}); }
    assignStaff(u, id, body) { return this.svc.assignStaff(u, id, body); }
    async getOrders(u, id) {
        const request = await this.svc.detail(u, id);
        return {
            prescriptions: request?.payload?.prescriptions || [],
            labs: request?.payload?.labs || []
        };
    }
    async endConsultation(u, id, body) {
        const request = await this.svc.detail(u, id);
        if (!['in_progress', 'IN_PROGRESS'].includes(String(request.status))) {
            throw new common_2.BadRequestException('consultation must be in progress before it can end');
        }
        const soapData = {
            subjective: body.soap_subjective,
            objective: body.soap_objective,
            assessment: body.soap_assessment,
            plan: body.soap_plan
        };
        const prescriptions = Array.isArray(body?.prescriptions) ? body.prescriptions : [];
        const labs = Array.isArray(body?.labs) ? body.labs : [];
        await this.reqRepo.updateOne({ id, provider_account_id: u.id }, { $set: { payload: { ...(request.payload || {}), soap: soapData, prescriptions, labs } } });
        const completed = await this.svc.complete(u, id, { note: 'clinical consultation ended' });
        this.events.emit('medical_orders.emitted', {
            threadId: id,
            prescriptions,
            labs
        });
        return {
            ok: true,
            message: 'consultation_ended_atomically',
            prescriptions,
            labs,
            state: completed.status
        };
    }
    async requestInsuranceCopay(u, id, body) {
        const { approvalStatus, patientCopay, approvalCode, reason } = body || {};
        const preq = await this.svc.detail(u, id);
        const patientId = preq.patient?.id || preq.patient_id || preq.patient_user_id || preq.user_id;
        if (!patientId)
            throw new common_2.BadRequestException('لا يمكن تحديد المريض لهذا الطلب');
        const price = Math.max(0, Number(preq.amount_total ?? preq.payload?.amount_total ?? 0));
        const patientShare = Math.min(price, Math.max(0, Number(patientCopay) || 0));
        const companyShare = Math.max(0, price - patientShare);
        const status = String(approvalStatus || '').toLowerCase();
        const rejected = ['rejected', 'denied', 'مرفوض'].includes(status);
        const state = rejected ? 'REJECTED' : patientShare > 0 ? 'COPAY_PENDING' : 'APPROVED_FULL';
        if (rejected && !String(reason || '').trim())
            throw new common_2.BadRequestException('سبب الرفض مطلوب');
        if (!rejected && price <= 0)
            throw new common_2.BadRequestException('مبلغ الخدمة الموثق مطلوب');
        const profile = await this.conn.collection('patientprofiles').findOne({ user_id: String(patientId) });
        if (!profile?.insurance?.company_id || !profile?.insurance?.policy_number) {
            throw new common_2.BadRequestException('سياسة تأمين المريض الموثقة مطلوبة');
        }
        const policy = profile.insurance;
        const col = this.conn.collection('insuranceservicerequests');
        const existing = await col.findOne({ booking_id: id, booking_kind: 'provider_request' });
        const patch = {
            patient_id: String(patientId), patient_name: preq.patient?.name || preq.patient_name || null,
            provider_id: String(u?.id), booking_id: id, booking_kind: 'provider_request',
            service_type: preq.type || 'consultation', price, policy,
            copay_amount: patientShare, copay_percent: price > 0 ? Math.round((patientShare / price) * 10000) / 100 : 0,
            approval_code: approvalCode || null, state,
            decided_by: String(u?.id), decided_at: new Date(),
            ...(rejected ? { rejection_reason: String(reason).trim() } : {}),
            updatedAt: new Date(),
        };
        let requestId;
        if (existing) {
            requestId = existing.id || String(existing._id);
            await col.updateOne({ _id: existing._id }, {
                $set: patch,
                $push: { history: { state, at: new Date(), by: String(u?.id), note: approvalCode || null } },
            });
        }
        else {
            requestId = (0, uuid_1.v4)();
            await col.insertOne({
                ...patch, id: requestId,
                history: [
                    { state: 'PENDING_PROVIDER_REVIEW', at: preq.createdAt || new Date(), by: String(patientId) },
                    { state, at: new Date(), by: String(u?.id), note: approvalCode || null },
                ],
                createdAt: new Date(),
            });
        }
        this.events.emit('insurance.decided', {
            request_id: requestId, patient_id: String(patientId), state, copay_amount: patientShare,
        });
        return { ok: true, request_id: requestId, state, copay_amount: patientShare };
    }
    async issueSickLeave(u, id, body) {
        if (!body?.patient_id)
            throw new common_2.BadRequestException('patient_id required');
        if (!body?.diagnosis?.trim())
            throw new common_2.BadRequestException('diagnosis required');
        const days = Math.max(1, Math.min(30, parseInt(body?.duration_days) || 1));
        const start = body?.start_date ? new Date(body.start_date) : new Date();
        if (isNaN(start.getTime()))
            throw new common_2.BadRequestException('invalid start_date');
        const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        const provider = await this.conn.collection('provider_accounts').findOne({ $or: [{ user_id: String(u?.id) }, { _id: u?.id }] });
        const doc = {
            id: (0, uuid_1.v4)(),
            tracking_id: (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.medical_report),
            patient_id: String(body.patient_id),
            patient_name: body.patient_name || null,
            report_type: 'medical_certificate',
            certificate_kind: 'sick_leave',
            title_ar: `إجازة مرضية لمدة ${days} ${days === 1 ? 'يوم' : 'أيام'}`,
            title_en: `${days}-day sick leave certificate`,
            summary: body.diagnosis.trim(),
            diagnosis: body.diagnosis.trim(),
            recommendations: body.recommendations || null,
            sick_leave: { start_date: start, end_date: end, duration_days: days },
            doctor_id: String(u?.id),
            doctor_name: u?.full_name || provider?.display_name || null,
            facility_id: provider?._id ? String(provider._id) : null,
            facility_name: provider?.display_name || null,
            appointment_id: id !== 'new' ? id : (body.appointment_id || null),
            attachments: [],
            issued_at: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.conn.collection('medicalreports').insertOne(doc);
        if (id && id !== 'new') {
            await this.conn.collection('appointments').updateOne({ $or: [{ id }, { _id: id }] }, { $push: { sickLeaves: { days, reason: doc.diagnosis, tracking_id: doc.tracking_id, at: new Date() } } });
        }
        this.events.emit('medical_report.created', { id: doc.id, patient_id: doc.patient_id, critical: false, tracking_id: doc.tracking_id });
        this.events.emit('sick_leave.issued', { patient_id: doc.patient_id, doctor_id: doc.doctor_id, tracking_id: doc.tracking_id, days });
        return { ok: true, message: 'sick_leave_issued', tracking_id: doc.tracking_id, verify_url: `/api/v1/medical-reports/track/${doc.tracking_id}`, days, start_date: start, end_date: end };
    }
    async issueMedicalReport(u, id, body) {
        if (!body?.findings?.trim() && !body?.summary?.trim())
            throw new common_2.BadRequestException('findings required');
        const request = await this.svc.detail(u, id);
        const patientId = request.patient?.id || request.patient_id || request.patient_user_id || request.user_id;
        if (!patientId)
            throw new common_2.BadRequestException('linked patient required');
        if (body?.patient_id && String(body.patient_id) !== String(patientId)) {
            throw new common_2.ForbiddenException('patient does not match the owned request');
        }
        const provider = await this.conn.collection('provider_accounts').findOne({ $or: [{ user_id: String(u?.id) }, { _id: u?.id }] });
        const doc = {
            id: (0, uuid_1.v4)(),
            tracking_id: (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.medical_report),
            patient_id: String(patientId),
            patient_name: request.patient?.name || request.patient_name || null,
            report_type: ['discharge_summary', 'surgery_report', 'consultation_note', 'second_opinion', 'clinic_note', 'other'].includes(body?.type) ? body.type : 'clinic_note',
            title_ar: body.title_ar || 'تقرير طبي',
            title_en: body.title_en || 'Medical Report',
            summary: body.findings?.trim() || body.summary?.trim(),
            body: body.conclusion || null,
            diagnosis: body.diagnosis || null,
            recommendations: body.recommendations || null,
            critical: !!body.critical,
            doctor_id: String(u?.id),
            doctor_name: u?.full_name || provider?.display_name || null,
            facility_id: provider?._id ? String(provider._id) : null,
            facility_name: provider?.display_name || null,
            appointment_id: id,
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            issued_at: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.conn.collection('medicalreports').insertOne(doc);
        this.events.emit('medical_report.created', { id: doc.id, patient_id: doc.patient_id, critical: doc.critical, tracking_id: doc.tracking_id });
        return { ok: true, message: 'medical_report_issued', tracking_id: doc.tracking_id, verify_url: `/api/v1/medical-reports/track/${doc.tracking_id}` };
    }
};
exports.ProviderRequestsController = ProviderRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/assign-staff'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderRequestsController.prototype, "assignStaff", null);
__decorate([
    (0, common_1.Get)(':id/orders'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProviderRequestsController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Post)(':id/end'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderRequestsController.prototype, "endConsultation", null);
__decorate([
    (0, common_1.Post)(':id/insurance-copay'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderRequestsController.prototype, "requestInsuranceCopay", null);
__decorate([
    (0, common_1.Post)(':id/sick-leave'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderRequestsController.prototype, "issueSickLeave", null);
__decorate([
    (0, common_1.Post)(':id/medical-report'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderRequestsController.prototype, "issueMedicalReport", null);
exports.ProviderRequestsController = ProviderRequestsController = __decorate([
    (0, common_1.Controller)('provider/requests'),
    __param(1, (0, common_1.Inject)('ProviderRequestRepository')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [provider_request_engine_service_1.ProviderRequestEngineService, Object, event_emitter_1.EventEmitter2,
        mongoose_2.Connection])
], ProviderRequestsController);
let ProviderWalletController = class ProviderWalletController {
    constructor(conn, ledger) {
        this.conn = conn;
        this.ledger = ledger;
    }
    get withdrawals() { return this.conn.collection('withdrawals'); }
    async requestWithdrawal(u, body) {
        throw new common_2.BadRequestException('withdrawal_alias_retired_use_provider_payouts_request');
    }
};
exports.ProviderWalletController = ProviderWalletController;
__decorate([
    (0, common_1.Post)('withdraw'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderWalletController.prototype, "requestWithdrawal", null);
exports.ProviderWalletController = ProviderWalletController = __decorate([
    (0, common_1.Controller)('provider/wallet'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        finance_engine_module_1.LedgerService])
], ProviderWalletController);
let ProviderNotificationsController = class ProviderNotificationsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u, q) { return this.svc.list(u, q); }
    markRead(u, id) { return this.svc.markRead(u, id); }
    markAllRead(u) { return this.svc.markAllRead(u); }
};
exports.ProviderNotificationsController = ProviderNotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderNotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderNotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('read-all'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderNotificationsController.prototype, "markAllRead", null);
exports.ProviderNotificationsController = ProviderNotificationsController = __decorate([
    (0, common_1.Controller)('provider/notifications'),
    __metadata("design:paramtypes", [provider_notifications_service_1.ProviderNotificationsService])
], ProviderNotificationsController);
let ProviderScheduleController = class ProviderScheduleController {
    constructor(svc) {
        this.svc = svc;
    }
    view(u, q) { return this.svc.view(u, q); }
};
exports.ProviderScheduleController = ProviderScheduleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderScheduleController.prototype, "view", null);
exports.ProviderScheduleController = ProviderScheduleController = __decorate([
    (0, common_1.Controller)('provider/schedule'),
    __metadata("design:paramtypes", [provider_schedule_service_1.ProviderScheduleService])
], ProviderScheduleController);
let ProviderDashboardController = class ProviderDashboardController {
    constructor(dash, seedSvc) {
        this.dash = dash;
        this.seedSvc = seedSvc;
    }
    me(u) { return this.dash.me(u); }
    stats(u) { return this.dash.stats(u); }
    recent(u, limit) {
        return this.dash.recentRequests(u, parseInt(limit || '3', 10) || 3);
    }
    getAvail(u) { return this.dash.getAvailability(u); }
    setAvail(u, body) { return this.dash.setAvailability(u, body); }
    seed(u) { return this.seedSvc.seed(u); }
    seedReset(u) { return this.seedSvc.resetSeed(u); }
};
exports.ProviderDashboardController = ProviderDashboardController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('dashboard/recent'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "recent", null);
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "getAvail", null);
__decorate([
    (0, common_1.Post)('availability'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "setAvail", null);
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)('seed/reset'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderDashboardController.prototype, "seedReset", null);
exports.ProviderDashboardController = ProviderDashboardController = __decorate([
    (0, common_1.Controller)('provider'),
    __metadata("design:paramtypes", [provider_dashboard_service_1.ProviderDashboardService,
        provider_seed_service_1.ProviderSeedService])
], ProviderDashboardController);
let ProviderCapabilitiesController = class ProviderCapabilitiesController {
    constructor(svc) {
        this.svc = svc;
    }
    listPharma(u) { return this.svc.listPharmacy(u); }
    upsertPharma(u, body) { return this.svc.upsertPharmacy(u, body); }
    delPharma(u, id) { return this.svc.deletePharmacy(u, id); }
    listLab(u) { return this.svc.listLab(u); }
    upsertLab(u, body) { return this.svc.upsertLab(u, body); }
    delLab(u, id) { return this.svc.deleteLab(u, id); }
    listRad(u) { return this.svc.listRadiology(u); }
    upsertRad(u, body) { return this.svc.upsertRadiology(u, body); }
    delRad(u, id) { return this.svc.deleteRadiology(u, id); }
    listDoc(u) { return this.svc.listDoctorSessions(u); }
    upsertDoc(u, body) { return this.svc.upsertDoctorSession(u, body); }
    delDoc(u, id) { return this.svc.deleteDoctorSession(u, id); }
    listHc(u) { return this.svc.listHomeCare(u); }
    upsertHc(u, body) { return this.svc.upsertHomeCare(u, body); }
    delHc(u, id) { return this.svc.deleteHomeCare(u, id); }
};
exports.ProviderCapabilitiesController = ProviderCapabilitiesController;
__decorate([
    (0, common_1.Get)('pharmacy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "listPharma", null);
__decorate([
    (0, common_1.Post)('pharmacy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "upsertPharma", null);
__decorate([
    (0, common_1.Delete)('pharmacy/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "delPharma", null);
__decorate([
    (0, common_1.Get)('lab'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "listLab", null);
__decorate([
    (0, common_1.Post)('lab'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "upsertLab", null);
__decorate([
    (0, common_1.Delete)('lab/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "delLab", null);
__decorate([
    (0, common_1.Get)('radiology'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "listRad", null);
__decorate([
    (0, common_1.Post)('radiology'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "upsertRad", null);
__decorate([
    (0, common_1.Delete)('radiology/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "delRad", null);
__decorate([
    (0, common_1.Get)('doctor-sessions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "listDoc", null);
__decorate([
    (0, common_1.Post)('doctor-sessions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "upsertDoc", null);
__decorate([
    (0, common_1.Delete)('doctor-sessions/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "delDoc", null);
__decorate([
    (0, common_1.Get)('home-care'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "listHc", null);
__decorate([
    (0, common_1.Post)('home-care'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "upsertHc", null);
__decorate([
    (0, common_1.Delete)('home-care/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderCapabilitiesController.prototype, "delHc", null);
exports.ProviderCapabilitiesController = ProviderCapabilitiesController = __decorate([
    (0, common_1.Controller)('provider/capabilities'),
    __metadata("design:paramtypes", [service_capability_service_1.ServiceCapabilityService])
], ProviderCapabilitiesController);
let ProviderZonesController = class ProviderZonesController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u) { return this.svc.listZones(u); }
    upsert(u, body) { return this.svc.upsertZone(u, body); }
    del(u, id) { return this.svc.deleteZone(u, id); }
};
exports.ProviderZonesController = ProviderZonesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderZonesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderZonesController.prototype, "upsert", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderZonesController.prototype, "del", null);
exports.ProviderZonesController = ProviderZonesController = __decorate([
    (0, common_1.Controller)('provider/zones'),
    __metadata("design:paramtypes", [service_capability_service_1.ServiceCapabilityService])
], ProviderZonesController);
let ProviderScheduleSlotsController = class ProviderScheduleSlotsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u) { return this.svc.listSlots(u); }
    upsert(u, body) { return this.svc.upsertSlot(u, body); }
    del(u, id) { return this.svc.deleteSlot(u, id); }
};
exports.ProviderScheduleSlotsController = ProviderScheduleSlotsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderScheduleSlotsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderScheduleSlotsController.prototype, "upsert", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderScheduleSlotsController.prototype, "del", null);
exports.ProviderScheduleSlotsController = ProviderScheduleSlotsController = __decorate([
    (0, common_1.Controller)('provider/schedule-slots'),
    __metadata("design:paramtypes", [scheduling_engine_service_1.SchedulingEngineService])
], ProviderScheduleSlotsController);
let ProviderScoreController = class ProviderScoreController {
    constructor(svc) {
        this.svc = svc;
    }
    me(u) { return this.svc.getMy(u); }
    recompute(u) { return this.svc.recompute(u.id); }
};
exports.ProviderScoreController = ProviderScoreController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderScoreController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('recompute'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderScoreController.prototype, "recompute", null);
exports.ProviderScoreController = ProviderScoreController = __decorate([
    (0, common_1.Controller)('provider/score'),
    __metadata("design:paramtypes", [provider_scoring_service_1.ProviderScoringService])
], ProviderScoreController);
let AdminMatchingController = class AdminMatchingController {
    constructor(matching, assignment) {
        this.matching = matching;
        this.assignment = assignment;
    }
    preview(u, id, limit) {
        return this.matching.matchForRequest(id, parseInt(limit || '10', 10) || 10);
    }
    previewAdHoc(u, body) {
        return this.matching.match(body || {});
    }
    dispatch(u, id, body) {
        return this.assignment.dispatch(id, body?.timeout_seconds || 120);
    }
    assign(u, rid, pid) {
        return this.assignment.manualAssign(u, rid, pid);
    }
    attempts(u, id) {
        return this.assignment.listAttempts(u, id);
    }
    expireStale(u) {
        return this.assignment.expireStale();
    }
    seedUnassigned(u, body) {
        const b = body || {};
        return this.assignment.createAndDispatch({
            type: b.type,
            patient: b.patient || { name: 'Test Patient' },
            payload: b.payload || {},
            summary_ar: b.summary_ar,
            summary_en: b.summary_en,
            amount_total: b.amount_total || 0,
            priority: b.priority,
            scheduled_at: b.scheduled_at ? new Date(b.scheduled_at) : undefined,
            patient_location: b.patient_location,
            strategy: b.strategy,
            timeout_seconds: b.timeout_seconds,
            seeded: true,
        });
    }
};
exports.AdminMatchingController = AdminMatchingController;
__decorate([
    (0, common_1.Get)('preview/:requestId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('preview'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "previewAdHoc", null);
__decorate([
    (0, common_1.Post)('dispatch/:requestId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Post)('assign/:requestId/:providerId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Param)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)('attempts/:requestId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "attempts", null);
__decorate([
    (0, common_1.Post)('expire-stale'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "expireStale", null);
__decorate([
    (0, common_1.Post)('seed-unassigned'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminMatchingController.prototype, "seedUnassigned", null);
exports.AdminMatchingController = AdminMatchingController = __decorate([
    (0, common_1.Controller)('admin/matching'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [provider_matching_service_1.ProviderMatchingService,
        assignment_strategy_service_1.AssignmentStrategyService])
], AdminMatchingController);
//# sourceMappingURL=provider.controllers.js.map