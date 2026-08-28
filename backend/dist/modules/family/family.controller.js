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
exports.FamilyController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const family_service_1 = require("./family.service");
let FamilyController = class FamilyController {
    constructor(familyService) {
        this.familyService = familyService;
    }
    authenticatedUserId(req) {
        const userId = req?.user?.id;
        if (typeof userId !== 'string' || userId.trim().length === 0) {
            throw new common_1.UnauthorizedException('authenticated_user_required');
        }
        return userId;
    }
    create(req, body) {
        return this.familyService.createGroup(this.authenticatedUserId(req), body.name);
    }
    myGroup(req) {
        return this.familyService.getMyGroup(this.authenticatedUserId(req));
    }
    invite(req, body) {
        return this.familyService.sendInvite(this.authenticatedUserId(req), body?.channel, body?.target);
    }
    join(req, body) {
        return this.familyService.joinGroup(this.authenticatedUserId(req), body.invite_code, body.display_name, body.relation);
    }
    leave(req) {
        return this.familyService.leaveGroup(this.authenticatedUserId(req));
    }
    setRelation(req, targetUserId, body) {
        return this.familyService.updateMemberRelation(this.authenticatedUserId(req), targetUserId, body.relation);
    }
    setContractPermissions(req, targetUserId, body) {
        return this.familyService.setMemberPermissions(this.authenticatedUserId(req), targetUserId, body?.scopes || []);
    }
    setPermissions(req, targetUserId, body) {
        return this.familyService.setMemberPermissions(this.authenticatedUserId(req), targetUserId, body.permissions);
    }
    getMemberRecords(req, targetUserId) {
        return this.familyService.getMemberRecords(this.authenticatedUserId(req), targetUserId);
    }
    removeContractMember(req, targetUserId) {
        return this.familyService.removeMember(this.authenticatedUserId(req), targetUserId);
    }
    removeMember(req, targetUserId) {
        return this.familyService.removeMember(this.authenticatedUserId(req), targetUserId);
    }
    contractMembers(req) {
        return this.familyService.listMembersContract(this.authenticatedUserId(req));
    }
    listMembers(req) {
        return this.familyService.listMembers(this.authenticatedUserId(req));
    }
    getMemberHealth(req, targetUserId) {
        return this.familyService.getMemberHealth(this.authenticatedUserId(req), targetUserId);
    }
    emergencyContacts(req) {
        return this.familyService.getEmergencyContacts(this.authenticatedUserId(req));
    }
    addEvent(req, body) {
        return this.familyService.addCalendarEvent(this.authenticatedUserId(req), body);
    }
    getCalendar(req) {
        return this.familyService.getCalendarEvents(this.authenticatedUserId(req));
    }
    deleteEvent(req, eventId) {
        return this.familyService.deleteCalendarEvent(this.authenticatedUserId(req), eventId);
    }
    requestPermissions(req, body) {
        return this.familyService.requestPermissions(this.authenticatedUserId(req), body.target_member_id, body.permissions);
    }
    pendingRequests(req) {
        return this.familyService.getPendingPermissionRequests(this.authenticatedUserId(req));
    }
    respondPermission(req, requestId, body) {
        return this.familyService.respondPermission(this.authenticatedUserId(req), requestId, body.decision, body.note, body.permissions);
    }
};
exports.FamilyController = FamilyController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my-group'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "myGroup", null);
__decorate([
    (0, common_1.Post)('invite'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)('join'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "join", null);
__decorate([
    (0, common_1.Post)('leave'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "leave", null);
__decorate([
    (0, common_1.Patch)('member/:userId/relation'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "setRelation", null);
__decorate([
    (0, common_1.Patch)('members/:memberId/permissions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "setContractPermissions", null);
__decorate([
    (0, common_1.Patch)('member/:userId/permissions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "setPermissions", null);
__decorate([
    (0, common_1.Get)('member-records/:userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "getMemberRecords", null);
__decorate([
    (0, common_1.Delete)('members/:memberId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "removeContractMember", null);
__decorate([
    (0, common_1.Delete)('remove-member/:userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)('my-group/members'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "contractMembers", null);
__decorate([
    (0, common_1.Get)('members'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Get)('member-health/:userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "getMemberHealth", null);
__decorate([
    (0, common_1.Get)('emergency-contacts'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "emergencyContacts", null);
__decorate([
    (0, common_1.Post)('calendar/event'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "addEvent", null);
__decorate([
    (0, common_1.Get)('calendar'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Delete)('calendar/event/:eventId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "deleteEvent", null);
__decorate([
    (0, common_1.Post)('permissions/request'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "requestPermissions", null);
__decorate([
    (0, common_1.Get)('permissions/pending'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "pendingRequests", null);
__decorate([
    (0, common_1.Put)('permissions/respond/:requestId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FamilyController.prototype, "respondPermission", null);
exports.FamilyController = FamilyController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.NoGuestsGuard),
    (0, common_1.Controller)('family'),
    __metadata("design:paramtypes", [family_service_1.FamilyService])
], FamilyController);
//# sourceMappingURL=family.controller.js.map