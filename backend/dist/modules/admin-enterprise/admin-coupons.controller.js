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
exports.AdminCouponsController = void 0;
exports.applyCoupon = applyCoupon;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
function applyCoupon(coupon, ctx) {
    const now = ctx.now || new Date();
    if (!coupon)
        return { ok: false, reason: 'not_found' };
    if (coupon.active === false)
        return { ok: false, reason: 'inactive' };
    if (!(coupon.value > 0))
        return { ok: false, reason: 'invalid_value' };
    if (coupon.discount_type === 'percent' && coupon.value > 100)
        return { ok: false, reason: 'invalid_value' };
    if (coupon.starts_at && now < new Date(coupon.starts_at))
        return { ok: false, reason: 'not_started' };
    if (coupon.expires_at && now > new Date(coupon.expires_at))
        return { ok: false, reason: 'expired' };
    if ((coupon.usage_limit_total ?? null) !== null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit_total)) {
        return { ok: false, reason: 'usage_limit_reached' };
    }
    if ((coupon.usage_limit_per_user ?? null) !== null && Number(ctx.user_previous_usage || 0) >= Number(coupon.usage_limit_per_user)) {
        return { ok: false, reason: 'per_user_limit_reached' };
    }
    if (Number(coupon.min_basket || 0) > Number(ctx.basket_total))
        return { ok: false, reason: 'min_basket_not_met' };
    let discount = coupon.discount_type === 'percent'
        ? Math.round(((Number(ctx.basket_total) * coupon.value) / 100) * 100) / 100
        : Math.min(coupon.value, ctx.basket_total);
    if (coupon.max_discount_cap != null && coupon.discount_type === 'percent') {
        discount = Math.min(discount, Number(coupon.max_discount_cap));
    }
    return { ok: true, code: coupon.code, discount: Math.max(0, Math.round(discount * 100) / 100) };
}
let AdminCouponsController = class AdminCouponsController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    async auditCoupon(me, action, code, id, reason, data) {
        await this.audit.write({
            action, actor: me, target_type: 'coupon', target_id: id, reason,
            before: data.before ?? null, after: data.after ?? null,
        });
    }
    get col() { return this.conn.collection('coupons'); }
    async list(active) {
        const q = {};
        if (active === 'true')
            q.active = true;
        if (active === 'false')
            q.active = false;
        return this.col.find(q).sort({ createdAt: -1 }).limit(200).project({ _id: 0 }).toArray();
    }
    async create(b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const code = String(b?.code || '').trim().toUpperCase();
        if (!/^[A-Z0-9_-]{4,24}$/.test(code))
            throw new common_1.BadRequestException('code_format_4_to_24_alnum');
        if (await this.col.findOne({ code }))
            throw new common_1.ConflictException('code_exists');
        if (!['percent', 'amount'].includes(String(b?.discount_type)))
            throw new common_1.BadRequestException('discount_type_invalid');
        const value = Number(b?.value);
        if (!Number.isFinite(value) || value <= 0 || (b?.discount_type === 'percent' && value > 100))
            throw new common_1.BadRequestException('value_invalid');
        const doc = {
            id: `cpn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            code,
            title_ar: String(b?.title_ar || '').trim() || code,
            description_ar: String(b?.description_ar || '').trim() || null,
            discount_type: b.discount_type,
            value,
            min_basket: Number(b?.min_basket ?? 0),
            max_discount_cap: b?.max_discount_cap != null ? Number(b.max_discount_cap) : null,
            segments: Array.isArray(b?.segments) ? b.segments.map(String) : [],
            starts_at: b?.starts_at ? new Date(b.starts_at) : null,
            expires_at: b?.expires_at ? new Date(b.expires_at) : null,
            usage_limit_total: b?.usage_limit_total != null ? Number(b.usage_limit_total) : null,
            usage_limit_per_user: b?.usage_limit_per_user != null ? Number(b.usage_limit_per_user) : 1,
            used_count: 0,
            active: b?.active !== false,
            created_by: me.id,
            createdAt: new Date(), updatedAt: new Date(),
        };
        await this.col.insertOne(doc);
        await this.auditCoupon(me, 'coupon_create', code, doc.id, reason, { after: { code, value, discount_type: b.discount_type } });
        const { _id, ...clean } = doc;
        return clean;
    }
    async update(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const before = await this.col.findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('coupon_not_found');
        const $set = { updatedAt: new Date() };
        if (b?.active !== undefined)
            $set.active = !!b.active;
        if (b?.min_basket !== undefined)
            $set.min_basket = Math.max(0, Number(b.min_basket) || 0);
        if (b?.max_discount_cap !== undefined)
            $set.max_discount_cap = b.max_discount_cap == null ? null : Number(b.max_discount_cap);
        if (b?.usage_limit_total !== undefined)
            $set.usage_limit_total = b.usage_limit_total == null ? null : Number(b.usage_limit_total);
        if (b?.usage_limit_per_user !== undefined)
            $set.usage_limit_per_user = Number(b.usage_limit_per_user) || 1;
        if (b?.expires_at !== undefined)
            $set.expires_at = b.expires_at ? new Date(b.expires_at) : null;
        if (b?.segments !== undefined)
            $set.segments = Array.isArray(b.segments) ? b.segments.map(String) : [];
        if (b?.value !== undefined) {
            const v = Number(b.value);
            if (!Number.isFinite(v) || v <= 0 || (before.discount_type === 'percent' && v > 100))
                throw new common_1.BadRequestException('value_invalid');
            $set.value = v;
        }
        await this.col.updateOne({ id }, { $set });
        await this.auditCoupon(me, 'coupon_update', before.code, id, reason, { before: { active: before.active, value: before.value }, after: $set });
        return this.col.findOne({ id }, { projection: { _id: 0 } });
    }
    async validate(b) {
        const code = String(b?.code || '').trim().toUpperCase();
        const basketTotal = Number(b?.basket_total ?? 0);
        if (!code || !Number.isFinite(basketTotal))
            throw new common_1.BadRequestException('code_and_basket_required');
        const coupon = await this.col.findOne({ code });
        const userPrev = b?.user_id
            ? await this.conn.collection('coupon_redemptions').countDocuments({ code, user_id: String(b.user_id) })
            : 0;
        const result = applyCoupon(coupon, {
            basket_total: basketTotal, user_id: String(b?.user_id || 'anonymous'),
            user_previous_usage: userPrev,
        });
        return result;
    }
    async redeem(b) {
        const code = String(b?.code || '').trim().toUpperCase();
        const userId = String(b?.user_id || '');
        const orderId = String(b?.order_id || '');
        if (!code || !userId)
            throw new common_1.BadRequestException('code_and_user_required');
        const res = await this.col.findOneAndUpdate({ code, $or: [{ usage_limit_total: null }, { $expr: { $lt: ['$used_count', '$usage_limit_total'] } }] }, { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } }, { returnDocument: 'after' });
        if (!res)
            throw new common_1.ConflictException('coupon_exhausted_or_missing');
        await this.conn.collection('coupon_redemptions').insertOne({ code, user_id: userId, order_id: orderId, redeemed_at: new Date() });
        return { ok: true, code, used_count: res.used_count };
    }
    async remove(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const before = await this.col.findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('coupon_not_found');
        await this.col.deleteOne({ id });
        await this.auditCoupon(me, 'coupon_delete', before.code, id, reason, { before: { code: before.code, active: before.active } });
        return { ok: true };
    }
};
exports.AdminCouponsController = AdminCouponsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.COUPONS_MANAGE),
    __param(0, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)('redeem'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "redeem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "remove", null);
exports.AdminCouponsController = AdminCouponsController = __decorate([
    (0, common_1.Controller)('admin/coupons'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminCouponsController);
//# sourceMappingURL=admin-coupons.controller.js.map