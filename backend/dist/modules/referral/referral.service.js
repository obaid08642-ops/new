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
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
let ReferralService = class ReferralService {
    constructor(connection, events) {
        this.connection = connection;
        this.events = events;
    }
    get users() { return this.connection.db.collection('users'); }
    get invites() { return this.connection.db.collection('referral_invites'); }
    async generateCode(fullName) {
        const base = (fullName || 'NABD').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'NABD';
        for (let i = 0; i < 10; i++) {
            const code = `${base}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const clash = await this.users.findOne({ referral_code: code });
            if (!clash)
                return code;
        }
        return `NABD-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
    }
    async getOrCreateCode(userId) {
        const user = await this.users.findOne({ id: userId }, { projection: { referral_code: 1, full_name: 1 } });
        if (!user)
            throw new common_1.NotFoundException('user not found');
        if (user.referral_code)
            return user.referral_code;
        const code = await this.generateCode(user.full_name);
        await this.users.updateOne({ id: userId, referral_code: { $exists: false } }, { $set: { referral_code: code } });
        const after = await this.users.findOne({ id: userId }, { projection: { referral_code: 1 } });
        return after?.referral_code || code;
    }
    async myDashboard(userId) {
        const code = await this.getOrCreateCode(userId);
        const invites = await this.invites
            .find({ referrer_id: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        const named = await this.users
            .find({ id: { $in: invites.map((i) => i.referred_user_id).filter(Boolean) } }, { projection: { id: 1, full_name: 1 } })
            .toArray();
        const nameById = new Map(named.map((u) => [u.id, u.full_name]));
        const stats = {
            total: invites.length,
            registered: invites.filter((i) => i.status === 'registered').length,
            rewarded: invites.filter((i) => i.status === 'rewarded').length,
            earned_points: invites.reduce((s, i) => s + (i.status === 'rewarded' ? (i.reward_points || 0) : 0), 0),
        };
        return {
            code,
            stats,
            invites: invites.map((i) => ({
                id: i.id,
                name: nameById.get(i.referred_user_id) || 'مستخدم جديد',
                status: i.status,
                reward_points: i.reward_points || 0,
                created_at: i.createdAt,
                rewarded_at: i.rewarded_at || null,
            })),
        };
    }
    async apply(userId, rawCode) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code)
            throw new common_1.BadRequestException('code is required');
        const referrer = await this.users.findOne({ referral_code: code }, { projection: { id: 1 } });
        if (!referrer)
            throw new common_1.NotFoundException('invalid referral code');
        if (referrer.id === userId)
            throw new common_1.BadRequestException('cannot use your own referral code');
        const me = await this.users.findOne({ id: userId }, { projection: { referred_by: 1, createdAt: 1 } });
        if (!me)
            throw new common_1.NotFoundException('user not found');
        if (me.referred_by)
            throw new common_1.ConflictException('a referral code was already applied to this account');
        const createdAt = me.createdAt ? new Date(me.createdAt).getTime() : Date.now();
        if (Date.now() - createdAt > 30 * 24 * 3600 * 1000) {
            throw new common_1.BadRequestException('referral codes can only be applied to new accounts');
        }
        const priorBookings = await this.connection.db.collection('appointments').countDocuments({
            patient_id: userId, status: 'COMPLETED',
        });
        if (priorBookings > 0) {
            throw new common_1.BadRequestException('referral codes can only be applied before your first completed booking');
        }
        const existing = await this.invites.findOne({ referred_user_id: userId });
        if (existing)
            throw new common_1.ConflictException('a referral code was already applied to this account');
        await this.invites.insertOne({
            id: (0, uuid_1.v4)(),
            referrer_id: referrer.id,
            referred_user_id: userId,
            code,
            status: 'registered',
            reward_points: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.users.updateOne({ id: userId }, { $set: { referred_by: referrer.id, referral_applied_at: new Date() } });
        return { ok: true, status: 'registered' };
    }
    async onBookingCompleted(payload) {
        if (!payload?.user_id)
            return;
        const invite = await this.invites.findOne({ referred_user_id: payload.user_id, status: 'registered' });
        if (!invite)
            return;
        const claimed = await this.invites.updateOne({ id: invite.id, status: 'registered' }, { $set: { status: 'rewarded', converted_at: new Date(), rewarded_at: new Date(), reward_points: 100, updatedAt: new Date() } });
        if (!claimed?.modifiedCount)
            return;
        this.events.emit('referral.converted', { user_id: invite.referrer_id, referred_id: payload.user_id });
        this.events.emit('referral.welcome_bonus', { user_id: payload.user_id, referral_id: invite.id });
    }
};
exports.ReferralService = ReferralService;
__decorate([
    (0, event_emitter_1.OnEvent)('booking.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralService.prototype, "onBookingCompleted", null);
exports.ReferralService = ReferralService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], ReferralService);
//# sourceMappingURL=referral.service.js.map