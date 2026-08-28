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
exports.CustomServicesController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const custom_services_service_1 = require("./custom-services.service");
const auth_guard_2 = require("../../common/auth.guard");
let CustomServicesController = class CustomServicesController {
    constructor(svc) {
        this.svc = svc;
    }
    create(u, b) { return this.svc.create(u, b); }
    mine(u, k) { return this.svc.mine(u, k); }
    one(u, id) { return this.svc.one(u, id); }
    list(k, s) { return this.svc.adminList(k, s); }
    updateStatus(u, id, b) { return this.svc.updateStatus(u, id, b.status, b.note); }
};
exports.CustomServicesController = CustomServicesController;
__decorate([
    (0, common_2.Post)(),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CustomServicesController.prototype, "create", null);
__decorate([
    (0, common_2.Get)('mine'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('kind')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomServicesController.prototype, "mine", null);
__decorate([
    (0, common_2.Get)(':id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomServicesController.prototype, "one", null);
__decorate([
    (0, common_2.Get)('admin/list'),
    __param(0, (0, common_2.Query)('kind')),
    __param(1, (0, common_2.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CustomServicesController.prototype, "list", null);
__decorate([
    (0, common_2.Patch)('admin/:id/status'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CustomServicesController.prototype, "updateStatus", null);
exports.CustomServicesController = CustomServicesController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('custom-services'),
    __metadata("design:paramtypes", [custom_services_service_1.CustomServicesService])
], CustomServicesController);
//# sourceMappingURL=custom-services.controller.js.map