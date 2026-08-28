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
exports.SupportController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const common_1 = require("@nestjs/common");
const support_service_1 = require("./support.service");
const auth_guard_2 = require("../../common/auth.guard");
let SupportController = class SupportController {
    constructor(svc) {
        this.svc = svc;
    }
    create(u, b) { return this.svc.create(u, b); }
    createTicket(u, b) { return this.svc.create(u, b); }
    mine(u) { return this.svc.mine(u); }
    one(u, id) { return this.svc.getOne(u, id); }
    reply(u, id, b) { return this.svc.reply(u, id, b.message); }
    adminList(status) { return this.svc.adminList(status); }
    adminUpdate(id, b) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }
    listTickets(id) {
        return this.svc.listTickets(id);
    }
    getFaqs() {
        return this.svc.getFaqs();
    }
    submitFeedback(id, body) {
        return this.svc.submitFeedback(id, body);
    }
    get(u) { return this.svc.getSettings(u); }
    update(u, b) { return this.svc.updateSettings(u, b); }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('tickets'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Get)('requests/mine'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('requests/:id/reply'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "reply", null);
__decorate([
    (0, common_1.Get)('admin/requests'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "adminList", null);
__decorate([
    (0, common_1.Patch)('admin/requests/:id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "adminUpdate", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, auth_guard_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "listTickets", null);
__decorate([
    (0, common_1.Get)('faqs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getFaqs", null);
__decorate([
    (0, common_1.Post)('feedback'),
    __param(0, (0, auth_guard_2.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "submitFeedback", null);
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "update", null);
exports.SupportController = SupportController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('support'),
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportController);
//# sourceMappingURL=support.controller.js.map