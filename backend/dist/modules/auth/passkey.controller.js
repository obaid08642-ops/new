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
exports.PasskeyController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const passkey_service_1 = require("./passkey.service");
const auth_guard_1 = require("../../common/auth.guard");
let PasskeyController = class PasskeyController {
    constructor(auth, passkeys) {
        this.auth = auth;
        this.passkeys = passkeys;
    }
    enrollOptions(user) {
        return this.passkeys.startEnrollment(user);
    }
    enrollVerify(user, body) {
        if (!body?.response)
            throw new common_1.BadRequestException('response_required');
        return this.passkeys.finishEnrollment(user, body.response, body.device_name);
    }
    async devices(user) {
        await this.passkeys.assertEnrollmentAllowed(user);
        return this.passkeys.listCredentials(user.id);
    }
    async remove(user, credentialId) {
        await this.passkeys.assertEnrollmentAllowed(user);
        return this.passkeys.removeCredential(user.id, credentialId);
    }
    async loginVerify(body, req, res) {
        if (!body?.identifier || !body?.response)
            throw new common_1.BadRequestException('identifier_and_response_required');
        const xff = req.headers['x-forwarded-for'] || '';
        const result = await this.auth.completePasskeyLogin(body.identifier, body.response, {
            ua: req.headers['user-agent'],
            ip: (xff.split(',')[0] || req.ip || '').trim() || undefined,
        });
        if (result && result.device_token) {
            res.cookie('nabd_admin_device', result.device_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 90 * 24 * 60 * 60 * 1000,
            });
        }
        if (result && result.token) {
            res.cookie('nabd_admin_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
};
exports.PasskeyController = PasskeyController;
__decorate([
    (0, common_1.Post)('enroll/options'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PasskeyController.prototype, "enrollOptions", null);
__decorate([
    (0, common_1.Post)('enroll/verify'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PasskeyController.prototype, "enrollVerify", null);
__decorate([
    (0, common_1.Get)('devices'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "devices", null);
__decorate([
    (0, common_1.Delete)('devices/:credentialId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('credentialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "remove", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('login/verify'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PasskeyController.prototype, "loginVerify", null);
exports.PasskeyController = PasskeyController = __decorate([
    (0, common_1.Controller)('auth/passkey'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [auth_service_1.AuthService, passkey_service_1.PasskeyService])
], PasskeyController);
//# sourceMappingURL=passkey.controller.js.map