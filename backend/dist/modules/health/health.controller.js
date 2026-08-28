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
exports.HealthModuleController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const health_service_1 = require("./health.service");
const auth_guard_2 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
let HealthModuleController = class HealthModuleController {
    constructor(svc) {
        this.svc = svc;
    }
    list(user, t, l) {
        return this.svc.listVitals(user, t, l ? parseInt(l, 10) : 100);
    }
    vitalsLog(user, limit) {
        return this.svc.listVitalsLog(user, limit ? parseInt(limit, 10) : 100);
    }
    vitalsChart(user, vital) { return this.svc.vitalsChart(user, vital); }
    vitalsRecent(user, vital, limit) { return this.svc.vitalsRecent(user, vital, limit ? parseInt(limit, 10) : 20); }
    latest(user) { return this.svc.latestVitals(user); }
    summary(user) { return this.svc.vitalsSummary(user); }
    score(user) { return this.svc.healthScore(user); }
    async add(user, body) {
        const reading = await this.svc.addVital(user, body);
        return { id: reading.id };
    }
    edit(user, id, body) { return this.svc.updateVital(user, id, body); }
    del(user, id) { return this.svc.deleteVital(user, id); }
    linkWearable() { throw new common_1.NotImplementedException('wearable_provider_not_enabled'); }
    unlinkWearable() { throw new common_1.NotImplementedException('wearable_provider_not_enabled'); }
    rl(user, a) { return this.svc.listReminders(user, a !== '0'); }
    rc(user, body) { return this.svc.createReminder(user, body); }
    rlg(user, id, body) {
        return this.svc.logReminder(user, id, body.status, body.time_key || '', body.occurred_at);
    }
    refill(user, id) { return this.svc.refillNow(user, id); }
    refillSnooze(user, id, body) { return this.svc.snoozeRefill(user, id, body?.days); }
    refillCancel(user, id) { return this.svc.cancelChronic(user, id); }
    rt(user, id, body) {
        return this.svc.updateReminder(user, id, body);
    }
    rd(user, id) { return this.svc.deleteReminder(user, id); }
    medicationRefill(user, id) { return this.svc.refillNow(user, id); }
    listSleep(user, l) {
        return this.svc.listSleep(user, l ? parseInt(l, 10) : 100);
    }
    addSleep(user, body) {
        return this.svc.addSleep(user, body);
    }
    listReports(user) {
        return this.svc.listReports(user);
    }
    listMedicationReminders(user) {
        return this.svc.listMedicationReminders(user);
    }
    listPrescriptions(user) {
        return this.svc.listPrescriptions(user);
    }
    listEmergencyContacts(user) {
        return this.svc.listEmergencyContacts(user);
    }
    addEmergencyContact(user, body) {
        return this.svc.addEmergencyContact(user, body);
    }
    removeEmergencyContact(user, id) {
        return this.svc.removeEmergencyContact(user, id);
    }
    listChronicDiseases(user) {
        return this.svc.listChronicDiseases(user);
    }
    listChronicMeds(user) {
        return this.svc.listChronicMeds(user);
    }
    listTrends(user) {
        return this.svc.listTrends(user);
    }
};
exports.HealthModuleController = HealthModuleController;
__decorate([
    (0, common_2.Get)('vitals'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('type')),
    __param(2, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "list", null);
__decorate([
    (0, common_2.Get)('vitals-log'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "vitalsLog", null);
__decorate([
    (0, common_2.Get)('vitals/chart'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('vital')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "vitalsChart", null);
__decorate([
    (0, common_2.Get)('vitals/recent'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('vital')),
    __param(2, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "vitalsRecent", null);
__decorate([
    (0, common_2.Get)('vitals/latest'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "latest", null);
__decorate([
    (0, common_2.Get)('vitals/summary'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "summary", null);
__decorate([
    (0, common_2.Get)('score'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "score", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('vitals'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HealthModuleController.prototype, "add", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Patch)('vitals/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "edit", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Delete)('vitals/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "del", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('wearables/link'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "linkWearable", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Delete)('wearables/:deviceId'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "unlinkWearable", null);
__decorate([
    (0, common_2.Get)('reminders'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "rl", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('reminders'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "rc", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('reminders/:id/log'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "rlg", null);
__decorate([
    (0, common_2.Post)('reminders/:id/refill'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "refill", null);
__decorate([
    (0, common_2.Post)('reminders/:id/refill/snooze'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "refillSnooze", null);
__decorate([
    (0, common_2.Post)('reminders/:id/refill/cancel'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "refillCancel", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Patch)('reminders/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "rt", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Delete)('reminders/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "rd", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('medications/:id/refill'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "medicationRefill", null);
__decorate([
    (0, common_2.Get)('sleep'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listSleep", null);
__decorate([
    (0, common_2.Post)('sleep'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "addSleep", null);
__decorate([
    (0, common_2.Get)('reports'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listReports", null);
__decorate([
    (0, common_2.Get)('medications/reminders'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listMedicationReminders", null);
__decorate([
    (0, common_2.Get)('prescriptions'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listPrescriptions", null);
__decorate([
    (0, common_2.Get)('emergency-contacts'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listEmergencyContacts", null);
__decorate([
    (0, common_2.Post)('emergency-contacts'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "addEmergencyContact", null);
__decorate([
    (0, common_2.Delete)('emergency-contacts/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "removeEmergencyContact", null);
__decorate([
    (0, common_2.Get)('chronic-diseases'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listChronicDiseases", null);
__decorate([
    (0, common_2.Get)('chronic-meds'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listChronicMeds", null);
__decorate([
    (0, common_2.Get)('trends'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HealthModuleController.prototype, "listTrends", null);
exports.HealthModuleController = HealthModuleController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    (0, common_2.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService])
], HealthModuleController);
//# sourceMappingURL=health.controller.js.map