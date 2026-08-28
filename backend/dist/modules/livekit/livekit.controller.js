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
exports.LiveKitController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const auth_guard_2 = require("../../common/auth.guard");
const livekit_service_1 = require("./livekit.service");
let LiveKitController = class LiveKitController {
    getWaitingRoom(u) {
        return this.svc.getProviderWaitingRoom(u.id);
    }
    pingPatient(u, body) {
        return this.svc.pingPatient(u.id, body.patient_id);
    }
    markNoShow(u, body) {
        return this.svc.markNoShow(u.id, body.appointment_id);
    }
    constructor(svc) {
        this.svc = svc;
    }
    async webhook(body) {
        return { received: true };
    }
    initiateCall(u, body) {
        const bookingId = body.booking_id || body.appointmentId;
        return this.svc.initiateCall(u.id, u.name || u.id, body.callee_id || '', body.call_type || 'video', bookingId);
    }
    joinCall(u, sessionId) {
        return this.svc.joinCall(sessionId, u.id, u.name || u.id);
    }
    endCall(u, sessionId) {
        return this.svc.endCall(sessionId, u.id);
    }
    rejectCall(u, sessionId) {
        return this.svc.rejectCall(sessionId, u.id);
    }
    saveMetrics(u, sessionId, body) {
        return this.svc.saveMetrics(sessionId, u.id, body.metrics);
    }
    history(u, page = 1, limit = 20) {
        return this.svc.getCallHistory(u.id, +page, +limit);
    }
    getSession(u, sessionId) {
        return this.svc.getSessionById(sessionId, u.id);
    }
    getRooms() {
        return this.svc.getActiveRooms();
    }
    getAnalytics() {
        return this.svc.getCallAnalytics();
    }
    getParticipants(roomName) {
        return this.svc.getRoomParticipants(roomName);
    }
    muteParticipant(roomName, pid, body) {
        return this.svc.muteParticipant(roomName, pid, body.muted);
    }
    removeParticipant(roomName, pid) {
        return this.svc.removeParticipant(roomName, pid);
    }
};
exports.LiveKitController = LiveKitController;
__decorate([
    (0, common_1.Get)('provider/waiting-room'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "getWaitingRoom", null);
__decorate([
    (0, common_1.Post)('provider/ping-patient'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "pingPatient", null);
__decorate([
    (0, common_1.Post)('provider/no-show'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "markNoShow", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveKitController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "initiateCall", null);
__decorate([
    (0, common_1.Post)(':sessionId/join'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "joinCall", null);
__decorate([
    (0, common_1.Post)(':sessionId/end'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "endCall", null);
__decorate([
    (0, common_1.Post)(':sessionId/reject'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "rejectCall", null);
__decorate([
    (0, common_1.Post)(':sessionId/metrics'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "saveMetrics", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "getSession", null);
__decorate([
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    (0, common_1.Get)('admin/rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "getRooms", null);
__decorate([
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    (0, common_1.Get)('admin/analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "getAnalytics", null);
__decorate([
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    (0, common_1.Get)('admin/rooms/:roomName/participants'),
    __param(0, (0, common_1.Param)('roomName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "getParticipants", null);
__decorate([
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    (0, common_1.Post)('admin/rooms/:roomName/mute/:participantId'),
    __param(0, (0, common_1.Param)('roomName')),
    __param(1, (0, common_1.Param)('participantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "muteParticipant", null);
__decorate([
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    (0, common_1.Post)('admin/rooms/:roomName/remove/:participantId'),
    __param(0, (0, common_1.Param)('roomName')),
    __param(1, (0, common_1.Param)('participantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LiveKitController.prototype, "removeParticipant", null);
exports.LiveKitController = LiveKitController = __decorate([
    (0, common_1.Controller)('calls'),
    (0, common_1.UseGuards)(auth_guard_2.JwtAuthGuard),
    __metadata("design:paramtypes", [livekit_service_1.LiveKitService])
], LiveKitController);
//# sourceMappingURL=livekit.controller.js.map