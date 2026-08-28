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
exports.PaymobController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const auth_guard_2 = require("../../common/auth.guard");
const paymob_service_1 = require("./paymob.service");
let PaymobController = class PaymobController {
    constructor(paymobService) {
        this.paymobService = paymobService;
    }
    getMethods() {
        return this.paymobService.getMethods();
    }
    async initiatePayment(payload) {
        return this.paymobService.initiate(payload);
    }
    async verifyPayment(payload) {
        return this.paymobService.verify(payload);
    }
};
exports.PaymobController = PaymobController;
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('methods'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymobController.prototype, "getMethods", null);
__decorate([
    (0, common_2.Post)('initiate'),
    __param(0, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymobController.prototype, "initiatePayment", null);
__decorate([
    (0, common_2.Post)('verify'),
    __param(0, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymobController.prototype, "verifyPayment", null);
exports.PaymobController = PaymobController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('payments/paymob'),
    __metadata("design:paramtypes", [paymob_service_1.PaymobService])
], PaymobController);
//# sourceMappingURL=paymob.controller.js.map