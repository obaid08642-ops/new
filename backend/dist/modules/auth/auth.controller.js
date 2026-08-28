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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const DEVICE_COOKIE = 'nabd_admin_device';
const PATIENT_ACCESS_COOKIE = 'nabd_patient_access';
const PATIENT_REFRESH_COOKIE = 'nabd_patient_refresh';
const PATIENT_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 1000;
const PATIENT_REFRESH_COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
const PATIENT_SESSION_COOKIE_OPTS = (req, maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
});
const DEVICE_COOKIE_OPTS = (req) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 90 * 24 * 60 * 60 * 1000,
});
function clientIp(req) {
    const xff = req.headers['x-forwarded-for'] || '';
    return (xff.split(',')[0] || req.ip || '').trim() || undefined;
}
const auth_service_1 = require("./auth.service");
const auth_guard_1 = require("../../common/auth.guard");
const class_validator_1 = require("class-validator");
const enums_1 = require("../../common/enums");
class RegisterDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "identifier", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "locale", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], RegisterDto.prototype, "consents", void 0);
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class GuestDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestDto.prototype, "deviceId", void 0);
class PatientOtpRequestDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientOtpRequestDto.prototype, "identifier", void 0);
class PatientOtpVerifyDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientOtpVerifyDto.prototype, "identifier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientOtpVerifyDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientOtpVerifyDto.prototype, "device_id", void 0);
class PatientSessionExchangeDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientSessionExchangeDto.prototype, "exchange_token", void 0);
class PatientForgotPasswordDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientForgotPasswordDto.prototype, "identifier", void 0);
class PatientResetPasswordDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientResetPasswordDto.prototype, "reset_token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], PatientResetPasswordDto.prototype, "new_password", void 0);
class ConvertGuestDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertGuestDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertGuestDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], ConvertGuestDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertGuestDto.prototype, "email", void 0);
let AuthController = class AuthController {
    constructor(auth) {
        this.auth = auth;
    }
    patientOtpRequest(dto) {
        return this.auth.requestPatientOtp(dto.identifier);
    }
    patientOtpVerify(dto) {
        return this.auth.verifyPatientOtp(dto.identifier, dto.code, dto.device_id);
    }
    async patientSessionExchange(dto, req, res) {
        const tokens = await this.auth.exchangePatientSession(dto.exchange_token);
        res.cookie(PATIENT_ACCESS_COOKIE, tokens.access_token, PATIENT_SESSION_COOKIE_OPTS(req, PATIENT_ACCESS_COOKIE_MAX_AGE));
        res.cookie(PATIENT_REFRESH_COOKIE, tokens.refresh_token, PATIENT_SESSION_COOKIE_OPTS(req, PATIENT_REFRESH_COOKIE_MAX_AGE));
        return { authenticated: true };
    }
    patientForgotPassword(dto) {
        return this.auth.forgotPatientPassword(dto.identifier);
    }
    patientResetPassword(dto) {
        return this.auth.resetPatientPassword(dto.reset_token, dto.new_password);
    }
    register(dto) {
        const isPatientContract = dto.name !== undefined || dto.identifier !== undefined || dto.locale !== undefined || dto.consents !== undefined;
        if (isPatientContract) {
            return this.auth.registerPatientContract({
                name: dto.name,
                identifier: dto.identifier,
                password: dto.password,
                locale: dto.locale,
                consents: dto.consents,
            });
        }
        if (!dto.full_name)
            throw new common_1.BadRequestException('full_name_required');
        return this.auth.register(dto);
    }
    async login(dto, req, res) {
        const id = dto?.identifier || dto?.email || dto?.phone || '';
        const result = await this.auth.login(id, dto?.password, {
            deviceToken: req.cookies?.[DEVICE_COOKIE],
            ua: req.headers['user-agent'],
            ip: clientIp(req),
        });
        if (result && result.device_token) {
            res.cookie(DEVICE_COOKIE, result.device_token, DEVICE_COOKIE_OPTS(req));
        }
        if (result && result.token) {
            res.cookie('nabd_admin_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        return result;
    }
    guest(dto, deviceId) {
        return this.auth.guest(dto.phone, deviceId);
    }
    convertGuest(guestUserId, dto) {
        return this.auth.convertGuest(guestUserId, dto);
    }
    async verify2fa(dto, req, res) {
        const id = dto?.identifier || dto?.email || dto?.phone || '';
        const result = await this.auth.verify2fa(id, dto?.code, {
            ua: req.headers['user-agent'],
            ip: clientIp(req),
        });
        if (result && result.device_token) {
            res.cookie(DEVICE_COOKIE, result.device_token, DEVICE_COOKIE_OPTS(req));
        }
        if (result && result.token) {
            res.cookie('nabd_admin_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }
        return result;
    }
    me(id) {
        return this.auth.me(id);
    }
    trustedDevices(user) {
        return this.auth.listTrustedDevices(user.id);
    }
    revokeTrustedDevice(user, deviceId) {
        return this.auth.revokeTrustedDevice(user.id, deviceId);
    }
    heartbeat(user, req) {
        return this.auth.deviceHeartbeat(user.id, req.cookies?.[DEVICE_COOKIE], req.headers['user-agent'], clientIp(req));
    }
    onlineSessions(user) {
        return this.auth.onlineDevices(user.id);
    }
    async refresh(body, deviceId) {
        if (!body?.refresh_token)
            throw new common_1.BadRequestException('refresh_token_required');
        return this.auth.refreshToken(body.refresh_token, deviceId);
    }
    async logoutAll(user) {
        return this.auth.logoutAllDevices(user.id);
    }
    async recordConsent(user, body) {
        if (!body?.document_type || !body?.version)
            throw new common_1.BadRequestException('document_type and version required');
        await this.auth.recordComplianceConsent(user.id, body.document_type, body.version);
        return { ok: true, message: 'consent_recorded' };
    }
    logout(res) {
        res.clearCookie('nabd_admin_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        return { success: true };
    }
    sendOtp(body) {
        const id = body.identifier || body.email || body.phone || '';
        return this.auth.sendOtp(id);
    }
    verifyOtp(body) {
        const id = body.identifier || body.email || body.phone || '';
        return this.auth.verifyOtp(id, body.code);
    }
    resetPassword(body) {
        const id = body.identifier || body.email || body.phone || '';
        if (!body?.code)
            throw new common_1.BadRequestException('code_required');
        return this.auth.resetPassword(id, body.password, body.code);
    }
    socialLogin(body) {
        return this.auth.socialLogin(body);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 600000 } }),
    (0, common_1.Post)('otp/request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PatientOtpRequestDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "patientOtpRequest", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 900000 } }),
    (0, common_1.Post)('otp/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PatientOtpVerifyDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "patientOtpVerify", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('session/exchange'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PatientSessionExchangeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "patientSessionExchange", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 600000 } }),
    (0, common_1.Post)('password/forgot'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PatientForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "patientForgotPassword", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('password/reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PatientResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "patientResetPassword", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }),
    (0, common_1.Post)('guest'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-device-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GuestDto, String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "guest", null);
__decorate([
    (0, common_1.Post)('convert-guest'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ConvertGuestDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "convertGuest", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('login/verify-2fa'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify2fa", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('trusted-devices'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "trustedDevices", null);
__decorate([
    (0, common_1.Delete)('trusted-devices/:deviceId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "revokeTrustedDevice", null);
__decorate([
    (0, common_1.Post)('heartbeat'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Get)('sessions/online'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "onlineSessions", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-device-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Post)('consent'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "recordConsent", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('send-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('verify-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }),
    (0, common_1.Post)('social-login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "socialLogin", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map