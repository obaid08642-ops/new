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
exports.SupportSessionContextController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./auth.guard");
let SupportSessionContextController = class SupportSessionContextController {
    context(user, req) {
        if (user?.scope !== 'impersonation' || !req?.impersonator || !req?.impersonationSession) {
            throw new common_1.ForbiddenException('impersonation_session_required');
        }
        return {
            active: true,
            read_only: true,
            session_id: req.impersonationSession.id,
            expires_at: new Date(req.impersonationSession.expiresAt).toISOString(),
            target: { id: user.id || user.sub, role: user.role },
            impersonator: { id: req.impersonator.id, role: req.impersonator.role },
        };
    }
};
exports.SupportSessionContextController = SupportSessionContextController;
__decorate([
    (0, common_1.Get)('context'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportSessionContextController.prototype, "context", null);
exports.SupportSessionContextController = SupportSessionContextController = __decorate([
    (0, common_1.Controller)('support-session'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard)
], SupportSessionContextController);
//# sourceMappingURL=support-session-context.controller.js.map