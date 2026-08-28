"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTrustModule = exports.DeviceTrustController = exports.DeviceTrustService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto = __importStar(require("crypto"));
const auth_guard_1 = require("../../common/auth.guard");
const redis_service_1 = require("../redis/redis.service");
let DeviceTrustService = class DeviceTrustService {
    constructor(redis, conn) {
        this.redis = redis;
        this.conn = conn;
        this.logger = new common_1.Logger('DeviceTrust');
    }
    client() { return this.redis.getClient?.(); }
    async challenge(userId, platform) {
        const nonce = crypto.randomBytes(24).toString('base64url');
        const c = this.client();
        if (c)
            await c.set(`attest:${platform}:${nonce}`, userId || 'guest', 'EX', 600);
        return { nonce, platform, ttl_seconds: 600 };
    }
    async verify(userId, body) {
        if (!body?.platform || !body?.token || !body?.nonce) {
            throw new common_1.BadRequestException('platform, token, nonce are required');
        }
        const c = this.client();
        if (c) {
            const owner = await c.get(`attest:${body.platform}:${body.nonce}`);
            if (!owner)
                throw new common_1.BadRequestException('challenge_expired_or_invalid');
            await c.del(`attest:${body.platform}:${body.nonce}`);
        }
        let verdict;
        if (body.platform === 'android') {
            verdict = await this.verifyPlayIntegrity(body.token);
        }
        else {
            verdict = await this.verifyAppAttest(body.token);
        }
        if (verdict.trusted) {
            if (c && userId)
                await c.set(`trusted:${userId}:${body.platform}`, '1', 'EX', 30 * 24 * 3600);
            await this.conn.collection('security_events').insertOne({
                type: 'device.trusted', user_id: userId, platform: body.platform, createdAt: new Date(),
            });
        }
        return verdict;
    }
    async verifyPlayIntegrity(token) {
        const saJson = process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON;
        if (!saJson) {
            return { trusted: false, reason: 'play_integrity_not_configured', signals: { placeholder: true } };
        }
        try {
            const { GoogleAuth } = require('google-auth-library');
            const auth = new GoogleAuth({ credentials: JSON.parse(saJson), scopes: ['https://www.googleapis.com/auth/playintegrity'] });
            const client = await auth.getClient();
            const pkg = process.env.PLAY_INTEGRITY_PACKAGE || 'com.nabd.patient';
            const resp = await client.request({
                url: `https://playintegrity.googleapis.com/v1/${pkg}:decodeIntegrityToken`,
                method: 'POST',
                data: { integrity_token: token },
            });
            const payload = resp.data?.tokenPayloadExternal || {};
            const ok = payload.appIntegrity?.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
                payload.deviceIntegrity?.deviceRecognitionVerdict?.includes('MEETS_DEVICE_INTEGRITY') &&
                payload.requestDetails?.requestPackageName === pkg;
            return {
                trusted: !!ok,
                reason: ok ? 'play_integrity_ok' : 'play_integrity_verdict_failed',
                signals: {
                    app: payload.appIntegrity?.appRecognitionVerdict,
                    device: payload.deviceIntegrity?.deviceRecognitionVerdict,
                    licensing: payload.accountDetails?.appLicensingVerdict,
                },
            };
        }
        catch (e) {
            this.logger.error(`Play Integrity verify error: ${e.message}`);
            return { trusted: false, reason: `play_integrity_error` };
        }
    }
    async verifyAppAttest(token) {
        const configured = !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY);
        if (!configured) {
            return { trusted: false, reason: 'app_attest_not_configured', signals: { placeholder: true } };
        }
        return { trusted: false, reason: 'app_attest_pending_keys' };
    }
    async isTrusted(userId, platform) {
        const c = this.client();
        if (!c || !userId)
            return false;
        return !!(await c.get(`trusted:${userId}:${platform}`));
    }
};
exports.DeviceTrustService = DeviceTrustService;
exports.DeviceTrustService = DeviceTrustService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        mongoose_2.Connection])
], DeviceTrustService);
let DeviceTrustController = class DeviceTrustController {
    constructor(svc) {
        this.svc = svc;
    }
    challenge(u, body) {
        return this.svc.challenge(u?.id, body?.platform || 'android');
    }
    guestChallenge(body) {
        return this.svc.challenge('guest', body?.platform || 'android');
    }
    verify(u, body) {
        return this.svc.verify(u?.id, body);
    }
    async status(u) {
        const [android, ios] = await Promise.all([
            this.svc.isTrusted(u?.id, 'android'),
            this.svc.isTrusted(u?.id, 'ios'),
        ]);
        return { user_id: u?.id, android_trusted: android, ios_trusted: ios };
    }
};
exports.DeviceTrustController = DeviceTrustController;
__decorate([
    (0, common_1.Post)('challenge'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DeviceTrustController.prototype, "challenge", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('challenge-guest'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeviceTrustController.prototype, "guestChallenge", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DeviceTrustController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceTrustController.prototype, "status", null);
exports.DeviceTrustController = DeviceTrustController = __decorate([
    (0, common_1.Controller)('device-trust'),
    __metadata("design:paramtypes", [DeviceTrustService])
], DeviceTrustController);
let DeviceTrustModule = class DeviceTrustModule {
};
exports.DeviceTrustModule = DeviceTrustModule;
exports.DeviceTrustModule = DeviceTrustModule = __decorate([
    (0, common_1.Module)({
        controllers: [DeviceTrustController],
        providers: [DeviceTrustService],
        exports: [DeviceTrustService],
    })
], DeviceTrustModule);
//# sourceMappingURL=device-trust.module.js.map