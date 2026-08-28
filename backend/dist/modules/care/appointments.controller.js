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
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const appointments_service_1 = require("./appointments.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const appointments_dto_1 = require("./appointments.dto");
let AppointmentsController = class AppointmentsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(body, user) {
        return this.svc.create(user, body);
    }
    mine(user, status) {
        return this.svc.listMine(user, status);
    }
    one(id, user) {
        return this.svc.one(user, id);
    }
    joinWaitlist(body, user) {
        return this.svc.joinWaitlist(user, body);
    }
    cancel(id, user, body) {
        return this.svc.cancel(id, user, body?.reason);
    }
    reschedule(id, user, body) {
        return this.svc.reschedule(id, user, body);
    }
    confirm(id, user) {
        return this.svc.confirm(id, user);
    }
    checkIn(id, user) {
        return this.svc.checkIn(id, user);
    }
    start(id, user) {
        return this.svc.start(id, user);
    }
    complete(id, user) {
        return this.svc.complete(id, user);
    }
    finishAppointment(id, body, user) {
        return this.svc.finish(id, body, user);
    }
    summary(id, user) {
        return this.svc.getSummary(id, user);
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [appointments_dto_1.CreateAppointmentDto, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('waitlist/join'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "joinWaitlist", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, appointments_dto_1.CancelAppointmentDto]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, appointments_dto_1.RescheduleAppointmentDto]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/check-in'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.ADMIN, enums_1.UserRole.PATIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Patch)(':id/start'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "start", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/finish'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.HOME_CARE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "finishAppointment", null);
__decorate([
    (0, common_1.Get)(':id/summary'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "summary", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, common_1.Controller)('care/appointments'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map