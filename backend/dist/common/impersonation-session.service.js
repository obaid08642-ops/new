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
exports.ImpersonationSessionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const permissions_1 = require("./permissions");
const effective_permissions_1 = require("./effective-permissions");
function role(value) {
    const valueString = String(value || '').trim().toLowerCase();
    const aliases = { laboratory: 'lab', radiology_center: 'radiology', hospital_admin: 'hospital_admin', pharmacy: 'pharmacy', pharmacist: 'pharmacist', homecare: 'home_care', nursing: 'nursing', nurse: 'nurse' };
    return aliases[valueString] || valueString;
}
let ImpersonationSessionService = class ImpersonationSessionService {
    constructor(connection) {
        this.connection = connection;
    }
    async validate(payload) {
        const sessionId = String(payload?.impersonation_session_id || '');
        if (!sessionId || payload?.scope !== 'impersonation')
            throw new common_1.UnauthorizedException('impersonation_session_required');
        const session = await this.connection.collection('impersonation_sessions').findOne({ id: sessionId });
        if (!session)
            throw new common_1.UnauthorizedException('impersonation_session_not_found');
        const now = new Date();
        if (session.status !== 'active')
            throw new common_1.ForbiddenException(`impersonation_session_${session.status}`);
        const expiresAt = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
        if (expiresAt.getTime() <= now.getTime()) {
            await this.connection.collection('impersonation_sessions').updateOne({ id: sessionId, status: 'active' }, { $set: { status: 'expired', expired_at: now, updatedAt: now } });
            throw new common_1.ForbiddenException('impersonation_session_expired');
        }
        if (String(session.target_user_id) !== String(payload.id || payload.sub) || role(session.target_role) !== role(payload.role)) {
            throw new common_1.UnauthorizedException('impersonation_target_mismatch');
        }
        const impersonator = await this.connection.collection('users').findOne({ id: session.impersonator_id }, { projection: { id: 1, role: 1, active: 1, suspended: 1, custom_role_keys: 1, permissions: 1 } });
        if (!impersonator || impersonator.active === false || impersonator.suspended === true)
            throw new common_1.ForbiddenException('impersonator_not_active');
        const hasPolicy = await (0, effective_permissions_1.hasEffectivePermission)(this.connection, impersonator, permissions_1.Permission.USER_IMPERSONATE);
        if (!hasPolicy)
            throw new common_1.ForbiddenException('impersonator_permission_revoked');
        return { session, impersonator };
    }
};
exports.ImpersonationSessionService = ImpersonationSessionService;
exports.ImpersonationSessionService = ImpersonationSessionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ImpersonationSessionService);
//# sourceMappingURL=impersonation-session.service.js.map