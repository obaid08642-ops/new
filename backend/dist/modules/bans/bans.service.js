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
exports.BansService = void 0;
const common_1 = require("@nestjs/common");
const ban_repository_1 = require("./repositories/ban.repository");
let BansService = class BansService {
    constructor(banModel) {
        this.banModel = banModel;
        this.activeBans = new Set();
    }
    async onModuleInit() {
        await this.refreshCache();
    }
    async refreshCache() {
        const bans = await this.banModel.find({
            is_active: true,
            $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }]
        });
        this.activeBans.clear();
        for (const b of bans) {
            this.activeBans.add(`${b.type}:${b.value}`);
        }
    }
    async ban(adminId, type, value, reason, expiresAt) {
        if (!value)
            throw new common_1.BadRequestException('Value is required');
        const b = await this.banModel.create({
            type,
            value,
            reason,
            banned_by_admin_id: adminId,
            expires_at: expiresAt
        });
        await this.refreshCache();
        return b;
    }
    async unban(value) {
        await this.banModel.updateMany({ value }, { $set: { is_active: false } });
        await this.refreshCache();
        return { success: true };
    }
    isBanned(type, value) {
        return this.activeBans.has(`${type}:${value}`);
    }
    async getBans() {
        return this.banModel.find({}).sort({ createdAt: -1 }).lean();
    }
};
exports.BansService = BansService;
exports.BansService = BansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('BanRepository')),
    __metadata("design:paramtypes", [ban_repository_1.BanRepository])
], BansService);
//# sourceMappingURL=bans.service.js.map