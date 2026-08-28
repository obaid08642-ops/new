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
exports.PasskeyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const server_1 = require("@simplewebauthn/server");
const passkey_credential_schema_1 = require("./schemas/passkey-credential.schema");
const user_schema_1 = require("../../schemas/user.schema");
const redis_service_1 = require("../redis/redis.service");
const ENROLL_CHAL_TTL = 300;
const LOGIN_CHAL_TTL = 300;
let PasskeyService = class PasskeyService {
    constructor(passkeyModel, userModel, redisService) {
        this.passkeyModel = passkeyModel;
        this.userModel = userModel;
        this.redisService = redisService;
    }
    get rpID() {
        return process.env.WEBAUTHN_RP_ID || 'nabd.plus';
    }
    get rpName() {
        return process.env.WEBAUTHN_RP_NAME || 'Nabd Admin';
    }
    get origin() {
        return (process.env.WEBAUTHN_ORIGIN || 'https://admin.nabd.plus').split(',').map((s) => s.trim());
    }
    get designatedEmail() {
        return (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
    }
    async assertEnrollmentAllowed(user) {
        const dbUser = await this.userModel.findOne({ id: user?.id }).lean();
        const email = (dbUser?.email || '').trim().toLowerCase();
        const role = dbUser?.role || user?.role;
        if (email !== this.designatedEmail)
            throw new common_1.ForbiddenException('passkey_enroll_not_allowed');
        if (role !== 'admin' && role !== 'super_admin')
            throw new common_1.ForbiddenException('admin_only');
        return dbUser;
    }
    async countCredentials(userId) {
        return this.passkeyModel.countDocuments({ user_id: userId });
    }
    async listCredentials(userId) {
        const docs = await this.passkeyModel.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
        return docs.map((d) => ({
            credential_id: d.credential_id,
            device_name: d.device_name,
            created_at: d.createdAt,
            last_used_at: d.last_used_at,
        }));
    }
    async removeCredential(userId, credentialId) {
        const count = await this.countCredentials(userId);
        if (count <= 1)
            throw new common_1.BadRequestException('cannot_remove_last_passkey');
        const res = await this.passkeyModel.deleteOne({ user_id: userId, credential_id: credentialId });
        if (!res.deletedCount)
            throw new common_1.BadRequestException('credential_not_found');
        return { ok: true };
    }
    async startEnrollment(user) {
        const dbUser = await this.assertEnrollmentAllowed(user);
        const existing = await this.passkeyModel.find({ user_id: user.id }).lean();
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: this.rpName,
            rpID: this.rpID,
            userName: (dbUser?.email || user.id).toLowerCase(),
            userDisplayName: dbUser?.full_name || dbUser?.email || 'Admin',
            userID: new TextEncoder().encode(user.id),
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
            },
            excludeCredentials: existing.map((c) => ({
                id: c.credential_id,
                transports: (c.transports || []),
            })),
            supportedAlgorithmIDs: [-7, -257],
        });
        await this.setChallenge(`webauthn_enroll:${user.id}`, options.challenge, ENROLL_CHAL_TTL);
        return options;
    }
    async finishEnrollment(user, response, deviceName) {
        await this.assertEnrollmentAllowed(user);
        const expectedChallenge = await this.takeChallenge(`webauthn_enroll:${user.id}`);
        if (!expectedChallenge)
            throw new common_1.UnauthorizedException('challenge_expired');
        let verification;
        try {
            verification = await (0, server_1.verifyRegistrationResponse)({
                response,
                expectedChallenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
                requireUserVerification: true,
            });
        }
        catch (e) {
            console.error('PASSKEY_ENROLL_VERIFY_FAIL', e?.message, JSON.stringify({ rpID: this.rpID, origin: this.origin }));
            throw new common_1.UnauthorizedException('passkey_verification_failed');
        }
        if (!verification.verified || !verification.registrationInfo) {
            throw new common_1.UnauthorizedException('passkey_verification_failed');
        }
        const { credential } = verification.registrationInfo;
        const already = await this.passkeyModel.findOne({ credential_id: credential.id });
        if (already)
            throw new common_1.BadRequestException('credential_already_registered');
        await this.passkeyModel.create({
            user_id: user.id,
            credential_id: credential.id,
            public_key: Buffer.from(credential.publicKey),
            counter: credential.counter || 0,
            transports: credential.transports || [],
            device_name: (deviceName || '').slice(0, 80),
            last_used_at: new Date(),
        });
        return { ok: true, credential_id: credential.id };
    }
    async startLogin(user) {
        const creds = await this.passkeyModel.find({ user_id: user.id }).lean();
        if (!creds.length)
            throw new common_1.BadRequestException('no_passkey_registered');
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID: this.rpID,
            userVerification: 'required',
            allowCredentials: creds.map((c) => ({
                id: c.credential_id,
                transports: (c.transports?.length ? c.transports : ['internal', 'hybrid']),
            })),
        });
        await this.setChallenge(`webauthn_login:${user.id}`, options.challenge, LOGIN_CHAL_TTL);
        return options;
    }
    async finishLogin(response) {
        const cred = await this.passkeyModel.findOne({ credential_id: response?.id }).lean();
        if (!cred)
            throw new common_1.UnauthorizedException('unknown_credential');
        const expectedChallenge = await this.takeChallenge(`webauthn_login:${cred.user_id}`);
        if (!expectedChallenge)
            throw new common_1.UnauthorizedException('challenge_expired');
        let verification;
        try {
            verification = await (0, server_1.verifyAuthenticationResponse)({
                response,
                expectedChallenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
                requireUserVerification: true,
                credential: {
                    id: cred.credential_id,
                    publicKey: new Uint8Array(cred.public_key),
                    counter: cred.counter || 0,
                    transports: (cred.transports || []),
                },
            });
        }
        catch (e) {
            console.error('PASSKEY_LOGIN_VERIFY_FAIL', e?.message, JSON.stringify({ rpID: this.rpID, origin: this.origin, cred_user: cred?.user_id }));
            throw new common_1.UnauthorizedException('passkey_verification_failed');
        }
        if (!verification.verified)
            throw new common_1.UnauthorizedException('passkey_verification_failed');
        await this.passkeyModel.updateOne({ credential_id: cred.credential_id }, { $set: { counter: verification.authenticationInfo.newCounter, last_used_at: new Date() } });
        return cred.user_id;
    }
    async setChallenge(key, challenge, ttl) {
        const client = this.redisService.getClient?.();
        if (!client)
            throw new common_1.BadRequestException('challenge_store_unavailable');
        await client.set(key, challenge, 'EX', ttl);
    }
    async takeChallenge(key) {
        const client = this.redisService.getClient?.();
        if (!client)
            return null;
        const val = await client.get(key);
        if (val)
            await client.del(key);
        return val;
    }
};
exports.PasskeyService = PasskeyService;
exports.PasskeyService = PasskeyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(passkey_credential_schema_1.PasskeyCredential.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        redis_service_1.RedisService])
], PasskeyService);
//# sourceMappingURL=passkey.service.js.map