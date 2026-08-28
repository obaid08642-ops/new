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
exports.NabdExtensionsController = void 0;
const common_1 = require("@nestjs/common");
const nabd_extensions_service_1 = require("./nabd-extensions.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const redis_cache_interceptor_1 = require("../../common/redis-cache.interceptor");
let NabdExtensionsController = class NabdExtensionsController {
    constructor(svc) {
        this.svc = svc;
    }
    async markNotificationRead(id, user) {
        if (id === 'all') {
            return this.svc.logActivity('notifications.read_all', user.id);
        }
        return this.svc.logActivity('notifications.read', user.id, undefined, { notificationId: id });
    }
    async getWalletBalance(user) {
        const balance = await this.svc.getWalletBalance(user.id, user.role !== enums_1.UserRole.PATIENT ? 'provider' : 'patient');
        return { balance };
    }
    async creditWallet(user, body) {
        return this.svc.processWalletTransaction({
            ownerId: user.id,
            ownerType: user.role !== enums_1.UserRole.PATIENT ? 'provider' : 'patient',
            amount: body.amount,
            type: 'credit',
            referenceType: body.referenceType || 'booking',
            referenceId: body.referenceId || 'manual',
            description: body.description || 'Manual Wallet Credit',
        });
    }
    async debitWallet(user, body) {
        return this.svc.processWalletTransaction({
            ownerId: user.id,
            ownerType: user.role !== enums_1.UserRole.PATIENT ? 'provider' : 'patient',
            amount: body.amount,
            type: 'debit',
            referenceType: body.referenceType || 'booking',
            referenceId: body.referenceId || 'manual',
            description: body.description || 'Manual Wallet Debit',
        });
    }
    async getReferralCode(user) {
        const code = await this.svc.generateReferralCode(user.id);
        return { code };
    }
    async claimReferral(user, body) {
        if (!body.code)
            throw new common_1.BadRequestException('Referral code is required');
        return this.svc.claimReferral(user.id, body.code);
    }
    async getFlags() {
        return this.svc.getFlags();
    }
    async updateFlag(admin, body) {
        if (!body.flagName)
            throw new common_1.BadRequestException('flagName is required');
        return this.svc.updateFlag(body.flagName, body.isEnabled, admin.id);
    }
    async getTimeline(user) {
        return this.svc.getTimeline(user.id);
    }
    async getPassport(user) {
        return this.svc.getHealthPassport(user.id);
    }
    async enrollProgram(user, body) {
        if (!body.programType)
            throw new common_1.BadRequestException('programType is required');
        return this.svc.enrollProgram(user.id, body.programType);
    }
    async getActivePrograms(user) {
        return this.svc.getActivePrograms(user.id);
    }
    async completeSession(user, body) {
        if (!body.programType || !body.sessionId)
            throw new common_1.BadRequestException('programType and sessionId are required');
        return this.svc.completeProgramSession(user.id, body.programType, body.sessionId);
    }
    async matchPharmacy(body) {
        return this.svc.matchPharmacy(body.lat, body.lng, body.requiredMedName || '');
    }
    async matchNurse(body) {
        return this.svc.matchNurse(body.lat, body.lng);
    }
    async getProviderRankings(lat, lng, type) {
        return this.svc.rankProviders(parseFloat(lat), parseFloat(lng), type || 'pharmacy');
    }
    async getFraudAlerts() {
        return this.svc.detectFraud();
    }
    async verifyNurseAttendance(nurse, body) {
        return this.svc.verifyNurseAttendance(nurse.id, body.visitId, body.lat, body.lng);
    }
    async getNursingChecklist(visitId) {
        return this.svc.getNursingChecklist(visitId);
    }
    async respondToBroadcast(provider, body) {
        await this.svc.logActivity('pharmacy.broadcast.response', undefined, provider.id, body);
        return { success: true, message: 'Response submitted successfully' };
    }
    async getExpiringInventory(provider) {
        return this.svc.getExpiringInventory(provider.id);
    }
    async verifyBarcode(staff, body) {
        await this.svc.logActivity('lab.sample.barcode_bound', undefined, staff.id, body);
        return { success: true, message: 'Barcode bound successfully to sample ID' };
    }
    async verifyLabResults(body) {
        return this.svc.verifyLabResultRanges(body.sampleId, body.actualValue);
    }
    async getHeatmaps() {
        return this.svc.getHeatmaps();
    }
    async placeAdBid(provider, body) {
        await this.svc.logActivity('ads.bid_placed', undefined, provider.id, body);
        return { success: true, message: 'Ad Bid placed successfully' };
    }
    async enrollCorporate(user, body) {
        return this.svc.verifyCorporateCredit(body.companyName, body.employeeId, body.requestedAmount);
    }
};
exports.NabdExtensionsController = NabdExtensionsController;
__decorate([
    (0, common_1.Patch)('notifications/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "markNotificationRead", null);
__decorate([
    (0, common_1.Get)('wallet/balance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getWalletBalance", null);
__decorate([
    (0, common_1.Post)('wallet/credit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "creditWallet", null);
__decorate([
    (0, common_1.Post)('wallet/debit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "debitWallet", null);
__decorate([
    (0, common_1.Post)('referral/code'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getReferralCode", null);
__decorate([
    (0, common_1.Post)('referral/claim'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "claimReferral", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('config/flags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getFlags", null);
__decorate([
    (0, common_1.Put)('admin/config/flags'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "updateFlag", null);
__decorate([
    (0, common_1.Get)('patients/timeline'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('patients/passport'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getPassport", null);
__decorate([
    (0, common_1.Post)('medical/programs/enroll'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "enrollProgram", null);
__decorate([
    (0, common_1.Get)('medical/programs/active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getActivePrograms", null);
__decorate([
    (0, common_1.Post)('medical/programs/complete-session'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "completeSession", null);
__decorate([
    (0, common_1.Post)('provider/match/pharmacy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "matchPharmacy", null);
__decorate([
    (0, common_1.Post)('provider/match/nurse'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "matchNurse", null);
__decorate([
    (0, common_1.Get)('provider/rankings'),
    (0, common_1.UseInterceptors)(redis_cache_interceptor_1.RedisCacheInterceptor),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getProviderRankings", null);
__decorate([
    (0, common_1.Get)('provider/fraud-alerts'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getFraudAlerts", null);
__decorate([
    (0, common_1.Post)('nursing/attendance/verify'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "verifyNurseAttendance", null);
__decorate([
    (0, common_1.Get)('nursing/visit/checklist'),
    __param(0, (0, common_1.Query)('visitId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getNursingChecklist", null);
__decorate([
    (0, common_1.Post)('pharmacy/broadcast/respond'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "respondToBroadcast", null);
__decorate([
    (0, common_1.Get)('pharmacy/inventory/expiry'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getExpiringInventory", null);
__decorate([
    (0, common_1.Post)('labs/samples/barcode-verify'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "verifyBarcode", null);
__decorate([
    (0, common_1.Post)('labs/results/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "verifyLabResults", null);
__decorate([
    (0, common_1.Get)('admin/analytics/heatmaps'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "getHeatmaps", null);
__decorate([
    (0, common_1.Post)('admin/ads/bid'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "placeAdBid", null);
__decorate([
    (0, common_1.Post)('corporate/enroll'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NabdExtensionsController.prototype, "enrollCorporate", null);
exports.NabdExtensionsController = NabdExtensionsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [nabd_extensions_service_1.NabdExtensionsService])
], NabdExtensionsController);
//# sourceMappingURL=nabd-extensions.controller.js.map