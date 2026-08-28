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
exports.ProviderNotificationsService = void 0;
const common_1 = require("@nestjs/common");
const providernotification_repository_1 = require("./repositories/providernotification.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
let ProviderNotificationsService = class ProviderNotificationsService {
    constructor(notifs) {
        this.notifs = notifs;
    }
    async list(user, q) {
        assertProvider(user);
        const filter = { provider_account_id: user.id };
        if (q.unread_only === 'true' || q.unread_only === '1')
            filter.read = false;
        const limit = Math.min(parseInt(q.limit || '50', 10) || 50, 200);
        const offset = parseInt(q.offset || '0', 10) || 0;
        const items = await this.notifs.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
        const total = await this.notifs.countDocuments(filter);
        const unread_count = await this.notifs.countDocuments({ provider_account_id: user.id, read: false });
        return { items, total, unread_count, limit, offset };
    }
    async markRead(user, id) {
        assertProvider(user);
        const n = await this.notifs.findOne({ id, provider_account_id: user.id });
        if (!n)
            throw new common_1.NotFoundException('notification not found');
        if (!n.read) {
            n.read = true;
            n.read_at = new Date();
            await n.save();
        }
        return { ok: true };
    }
    async markAllRead(user) {
        assertProvider(user);
        await this.notifs.updateMany({ provider_account_id: user.id, read: false }, { $set: { read: true, read_at: new Date() } });
        return { ok: true };
    }
    async createSystem(provider_account_id, input) {
        return this.notifs.create({ provider_account_id, ...input });
    }
};
exports.ProviderNotificationsService = ProviderNotificationsService;
exports.ProviderNotificationsService = ProviderNotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderNotificationRepository')),
    __metadata("design:paramtypes", [providernotification_repository_1.ProviderNotificationRepository])
], ProviderNotificationsService);
//# sourceMappingURL=provider-notifications.service.js.map