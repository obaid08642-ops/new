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
exports.I18nController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const i18n_service_1 = require("./i18n.service");
const auth_guard_2 = require("../../common/auth.guard");
let I18nController = class I18nController {
    constructor(svc) {
        this.svc = svc;
    }
    bundle(lang) {
        return this.svc.all(lang || 'ar');
    }
    raw() {
        return this.svc.raw();
    }
};
exports.I18nController = I18nController;
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)(),
    __param(0, (0, common_2.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], I18nController.prototype, "bundle", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], I18nController.prototype, "raw", null);
exports.I18nController = I18nController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('i18n'),
    __metadata("design:paramtypes", [i18n_service_1.I18nService])
], I18nController);
//# sourceMappingURL=i18n.controller.js.map