"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpersonationSecurityModule = void 0;
const common_1 = require("@nestjs/common");
const impersonation_session_service_1 = require("./impersonation-session.service");
const support_session_context_controller_1 = require("./support-session-context.controller");
let ImpersonationSecurityModule = class ImpersonationSecurityModule {
};
exports.ImpersonationSecurityModule = ImpersonationSecurityModule;
exports.ImpersonationSecurityModule = ImpersonationSecurityModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [impersonation_session_service_1.ImpersonationSessionService],
        controllers: [support_session_context_controller_1.SupportSessionContextController],
        exports: [impersonation_session_service_1.ImpersonationSessionService],
    })
], ImpersonationSecurityModule);
//# sourceMappingURL=impersonation-security.module.js.map