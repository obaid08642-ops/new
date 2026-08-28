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
exports.HospitalStaffModule = exports.HospitalStaffController = exports.HospitalStaffService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const user_schema_1 = require("../../schemas/user.schema");
const schemas_1 = require("../provider/schemas");
const enums_1 = require("../../common/enums");
const bcrypt = __importStar(require("bcryptjs"));
const uuid_1 = require("uuid");
const STAFF_ROLES = [enums_1.UserRole.DOCTOR, enums_1.UserRole.LAB, enums_1.UserRole.RADIOLOGY, enums_1.UserRole.NURSE, enums_1.UserRole.PHARMACY];
let HospitalStaffService = class HospitalStaffService {
    constructor(users, accounts) {
        this.users = users;
        this.accounts = accounts;
    }
    async getOwnerAccount(user) {
        if (![enums_1.UserRole.HOSPITAL, enums_1.UserRole.ADMIN].includes(user.role))
            throw new common_1.ForbiddenException('only_hospital_owner');
        const acc = await this.accounts.findOne({ owner_user_id: user.id });
        if (!acc && user.role !== enums_1.UserRole.ADMIN)
            throw new common_1.NotFoundException('provider_account_missing');
        return acc;
    }
    async list(user) {
        const acc = await this.getOwnerAccount(user);
        const filter = acc ? { $or: [{ parent_provider_account_id: acc.id }, { parent_account_id: acc.id }] } : {};
        return this.users.find(filter, { password_hash: 0, _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    }
    async create(user, body) {
        const acc = await this.getOwnerAccount(user);
        if (!body?.full_name?.trim() || !body?.phone?.trim() || !body?.password)
            throw new common_1.BadRequestException('full_name_phone_password_required');
        const role = body.staff_role;
        if (!STAFF_ROLES.includes(role))
            throw new common_1.BadRequestException('invalid_staff_role');
        const existing = await this.users.findOne({ $or: [{ phone: body.phone.trim() }, ...(body.email ? [{ email: body.email.trim().toLowerCase() }] : [])] });
        if (existing)
            throw new common_1.BadRequestException('user_exists');
        const hash = await bcrypt.hash(body.password, 10);
        const u = await this.users.create({
            id: (0, uuid_1.v4)(),
            full_name: body.full_name.trim(),
            phone: body.phone.trim(),
            email: body.email?.trim().toLowerCase(),
            password_hash: hash,
            role,
            verified: true,
            parent_provider_account_id: acc?.id,
            department: body.department,
            permissions: body.permissions || [],
            schedule: body.schedule,
            suspended: false,
            specialty: body.specialty,
            degree: body.degree,
            years_experience: body.years_experience,
            license_number: body.license_number,
            consultation_fee: body.consultation_fee || 0,
        });
        const o = u.toObject();
        delete o.password_hash;
        delete o._id;
        delete o.__v;
        return o;
    }
    async update(user, staffId, body) {
        const acc = await this.getOwnerAccount(user);
        const staff = await this.users.findOne({ id: staffId });
        if (!staff)
            throw new common_1.NotFoundException('staff_not_found');
        if (acc && ![staff.get('parent_provider_account_id'), staff.get('parent_account_id')].includes(acc.id) && user.role !== enums_1.UserRole.ADMIN)
            throw new common_1.ForbiddenException('not_owner');
        const patch = {};
        for (const k of ['full_name', 'phone', 'email', 'department', 'permissions', 'schedule', 'specialty', 'degree', 'years_experience', 'license_number', 'consultation_fee'])
            if (body[k] !== undefined)
                patch[k] = body[k];
        if (patch.email)
            patch.email = String(patch.email).toLowerCase();
        await this.users.updateOne({ id: staffId }, { $set: patch });
        const u = await this.users.findOne({ id: staffId }, { password_hash: 0, _id: 0, __v: 0 }).lean();
        return u;
    }
    async suspend(user, staffId, suspended) {
        const acc = await this.getOwnerAccount(user);
        const staff = await this.users.findOne({ id: staffId });
        if (!staff)
            throw new common_1.NotFoundException('staff_not_found');
        if (acc && ![staff.get('parent_provider_account_id'), staff.get('parent_account_id')].includes(acc.id) && user.role !== enums_1.UserRole.ADMIN)
            throw new common_1.ForbiddenException('not_owner');
        await this.users.updateOne({ id: staffId }, { $set: { suspended } });
        return { ok: true, suspended };
    }
    async remove(user, staffId) {
        const acc = await this.getOwnerAccount(user);
        const staff = await this.users.findOne({ id: staffId });
        if (!staff)
            throw new common_1.NotFoundException('staff_not_found');
        if (acc && ![staff.get('parent_provider_account_id'), staff.get('parent_account_id')].includes(acc.id) && user.role !== enums_1.UserRole.ADMIN)
            throw new common_1.ForbiddenException('not_owner');
        await this.users.deleteOne({ id: staffId });
        return { ok: true };
    }
    async resetPassword(user, staffId, newPassword) {
        if (!newPassword || newPassword.length < 6)
            throw new common_1.BadRequestException('weak_password');
        const acc = await this.getOwnerAccount(user);
        const staff = await this.users.findOne({ id: staffId });
        if (!staff)
            throw new common_1.NotFoundException('staff_not_found');
        if (acc && ![staff.get('parent_provider_account_id'), staff.get('parent_account_id')].includes(acc.id) && user.role !== enums_1.UserRole.ADMIN)
            throw new common_1.ForbiddenException('not_owner');
        const hash = await bcrypt.hash(newPassword, 10);
        await this.users.updateOne({ id: staffId }, { $set: { password_hash: hash } });
        return { ok: true };
    }
};
exports.HospitalStaffService = HospitalStaffService;
exports.HospitalStaffService = HospitalStaffService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(schemas_1.ProviderAccount.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], HospitalStaffService);
let HospitalStaffController = class HospitalStaffController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u) { return this.svc.list(u); }
    create(u, b) { return this.svc.create(u, b); }
    update(u, id, b) { return this.svc.update(u, id, b); }
    suspend(u, id, b) { return this.svc.suspend(u, id, b?.suspended !== false); }
    reset(u, id, b) { return this.svc.resetPassword(u, id, b?.password); }
    remove(u, id) { return this.svc.remove(u, id); }
};
exports.HospitalStaffController = HospitalStaffController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "reset", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HospitalStaffController.prototype, "remove", null);
exports.HospitalStaffController = HospitalStaffController = __decorate([
    (0, common_1.Controller)('hospital/staff'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [HospitalStaffService])
], HospitalStaffController);
let HospitalStaffModule = class HospitalStaffModule {
};
exports.HospitalStaffModule = HospitalStaffModule;
exports.HospitalStaffModule = HospitalStaffModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: schemas_1.ProviderAccount.name, schema: schemas_1.ProviderAccountSchema },
            ]),
        ],
        controllers: [HospitalStaffController],
        providers: [HospitalStaffService],
        exports: [HospitalStaffService],
    })
], HospitalStaffModule);
//# sourceMappingURL=hospital-staff.module.js.map