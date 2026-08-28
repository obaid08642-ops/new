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
exports.ReturnsController = void 0;
const common_1 = require("@nestjs/common");
const returns_service_1 = require("./returns.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let ReturnsController = class ReturnsController {
    constructor(returnsService) {
        this.returnsService = returnsService;
    }
    async create(user, body) {
        return this.returnsService.createRequest(user.id, body);
    }
    async list(user) {
        return this.returnsService.myReturns(user.id);
    }
    async providerList(user) {
        return this.returnsService.providerReturns(user.id);
    }
    async eligibility(orderId, user) {
        return this.returnsService.eligibility(user.id, orderId);
    }
    async getDetails(id, user) {
        return this.returnsService.getById(id, user.id, user.role);
    }
    async decide(id, body, adminUser) {
        return this.returnsService.adminDecide(id, body.decision, body.note || '', adminUser);
    }
};
exports.ReturnsController = ReturnsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('provider/list'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "providerList", null);
__decorate([
    (0, common_1.Get)('eligibility/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "eligibility", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "getDetails", null);
__decorate([
    (0, common_1.Post)(':id/decide'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ReturnsController.prototype, "decide", null);
exports.ReturnsController = ReturnsController = __decorate([
    (0, common_1.Controller)('pharmacy/returns'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [returns_service_1.ReturnsService])
], ReturnsController);
//# sourceMappingURL=returns.controller.js.map