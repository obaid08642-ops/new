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
exports.BansController = void 0;
const common_1 = require("@nestjs/common");
const bans_service_1 = require("./bans.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const class_validator_1 = require("class-validator");
class CreateBanDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(['ip', 'device']),
    __metadata("design:type", String)
], CreateBanDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBanDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBanDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], CreateBanDto.prototype, "expires_at", void 0);
let BansController = class BansController {
    constructor(bansService) {
        this.bansService = bansService;
    }
    ban(adminId, dto) {
        return this.bansService.ban(adminId, dto.type, dto.value, dto.reason, dto.expires_at);
    }
    unban(value) {
        return this.bansService.unban(value);
    }
    getBans() {
        return this.bansService.getBans();
    }
};
exports.BansController = BansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateBanDto]),
    __metadata("design:returntype", void 0)
], BansController.prototype, "ban", null);
__decorate([
    (0, common_1.Delete)(':value'),
    __param(0, (0, common_1.Param)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BansController.prototype, "unban", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BansController.prototype, "getBans", null);
exports.BansController = BansController = __decorate([
    (0, common_1.Controller)('bans'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.SUPER_ADMIN, enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [bans_service_1.BansService])
], BansController);
//# sourceMappingURL=bans.controller.js.map