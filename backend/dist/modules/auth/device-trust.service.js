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
exports.DeviceTrustService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const trusted_device_schema_1 = require("./schemas/trusted-device.schema");
const redis_service_1 = require("../redis/redis.service");
const SESSION_TTL_SEC = 300;
let DeviceTrustService = class DeviceTrustService {
    constructor(model, redis) {
        this.model = model;
        this.redis = redis;
        this.logger = new common_1.Logger('DeviceTrust');
    }
    hash(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    deviceNameFromUa(ua) {
        if (!ua)
            return 'جهاز غير معروف';
        if (/iPhone/i.test(ua))
            return 'iPhone';
        if (/iPad/i.test(ua))
            return 'iPad';
        if (/Macintosh|Mac OS X/i.test(ua))
            return 'Mac';
        if (/Windows/i.test(ua))
            return 'Windows PC';
        if (/Android/i.test(ua))
            return 'Android';
        if (/Linux/i.test(ua))
            return 'Linux';
        return 'جهاز آخر';
    }
    async issue(userId, ua, ip, name) {
        const token = (0, crypto_1.randomBytes)(32).toString('base64url');
        const doc = await this.model.create({
            user_id: userId,
            token_hash: this.hash(token),
            name: name || this.deviceNameFromUa(ua),
            user_agent: (ua || '').slice(0, 300),
            ip,
            last_ip: ip,
            last_seen_at: new Date(),
        });
        return { token, device: doc.toObject() };
    }
    async validate(userId, token, ip) {
        if (!token || typeof token !== 'string' || token.length < 20)
            return null;
        const dev = await this.model.findOne({ token_hash: this.hash(token), user_id: userId, revoked: false });
        if (!dev)
            return null;
        dev.last_seen_at = new Date();
        if (ip)
            dev.last_ip = ip;
        await dev.save();
        return dev.toObject();
    }
    async list(userId) {
        return this.model
            .find({ user_id: userId, revoked: false }, { token_hash: 0 })
            .sort({ last_seen_at: -1 })
            .lean();
    }
    async revoke(userId, deviceId) {
        await this.model.updateOne({ id: deviceId, user_id: userId }, { $set: { revoked: true } });
        return { ok: true };
    }
    async heartbeat(userId, deviceToken, ua, ip) {
        const registryKey = `sessions:${userId}`;
        const deviceKey = deviceToken ? this.hash(deviceToken).slice(0, 16) : 'unknown-device';
        let registry = {};
        try {
            registry = JSON.parse((await this.redis.get(registryKey)) || '{}');
        }
        catch { }
        registry[deviceKey] = {
            name: this.deviceNameFromUa(ua),
            ua: (ua || '').slice(0, 200),
            ip,
            at: new Date().toISOString(),
        };
        const cutoff = Date.now() - SESSION_TTL_SEC * 1000;
        for (const [k, v] of Object.entries(registry)) {
            if (!v?.at || new Date(v.at).getTime() < cutoff)
                delete registry[k];
        }
        await this.redis.set(registryKey, JSON.stringify(registry), SESSION_TTL_SEC);
        return { ok: true };
    }
    async onlineSessions(userId) {
        let registry = {};
        try {
            registry = JSON.parse((await this.redis.get(`sessions:${userId}`)) || '{}');
        }
        catch { }
        const cutoff = Date.now() - SESSION_TTL_SEC * 1000;
        return Object.entries(registry)
            .filter(([, v]) => v?.at && new Date(v.at).getTime() >= cutoff)
            .map(([k, v]) => ({ session: k, ...v }));
    }
};
exports.DeviceTrustService = DeviceTrustService;
exports.DeviceTrustService = DeviceTrustService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(trusted_device_schema_1.TrustedDevice.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        redis_service_1.RedisService])
], DeviceTrustService);
//# sourceMappingURL=device-trust.service.js.map