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
exports.CoturnController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const coturn_service_1 = require("./coturn.service");
let CoturnController = class CoturnController {
    constructor(svc) {
        this.svc = svc;
    }
    getIceConfig(u) {
        return this.svc.getIceServers(u.id);
    }
    getCredentials(u) {
        return this.svc.generateCredentials(u.id);
    }
};
exports.CoturnController = CoturnController;
__decorate([
    (0, common_1.Get)('config'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoturnController.prototype, "getIceConfig", null);
__decorate([
    (0, common_1.Get)('credentials'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoturnController.prototype, "getCredentials", null);
exports.CoturnController = CoturnController = __decorate([
    (0, common_1.Controller)('calls/ice'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [coturn_service_1.CoturnService])
], CoturnController);
//# sourceMappingURL=coturn.controller.js.map