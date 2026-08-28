import { BadRequestException, ConflictException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';

// ── Pure coupon engine (unit-tested) ─────────────────────────────────────

export interface CouponDoc {
  code: string;
  discount_type: 'percent' | 'amount';
  value: number;              // percent 0-100 OR SAR amount
  min_basket?: number;
  max_discount_cap?: number;  // SAR ceiling for percent discounts
  starts_at?: Date | null;
  expires_at?: Date | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  used_count?: number;
  active?: boolean;
}

export interface CouponContext {
  basket_total: number;
  user_id: string;
  now?: Date;
  user_previous_usage?: number;
}

export interface CouponResult { ok: true; code: string; discount: number }
export type CouponRejection =
  | 'not_found' | 'inactive' | 'expired' | 'not_started'
  | 'min_basket_not_met' | 'usage_limit_reached' | 'per_user_limit_reached' | 'invalid_value';

/** Deterministic validation+pricing — the single source of truth shared by
 *  checkout and the admin tester. */
export function applyCoupon(coupon: CouponDoc | null, ctx: CouponContext): CouponResult | { ok: false; reason: CouponRejection } {
  const now = ctx.now || new Date();
  if (!coupon) return { ok: false, reason: 'not_found' };
  if (coupon.active === false) return { ok: false, reason: 'inactive' };
  if (!(coupon.value > 0)) return { ok: false, reason: 'invalid_value' };
  if (coupon.discount_type === 'percent' && coupon.value > 100) return { ok: false, reason: 'invalid_value' };
  if (coupon.starts_at && now < new Date(coupon.starts_at)) return { ok: false, reason: 'not_started' };
  if (coupon.expires_at && now > new Date(coupon.expires_at)) return { ok: false, reason: 'expired' };
  if ((coupon.usage_limit_total ?? null) !== null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit_total)) {
    return { ok: false, reason: 'usage_limit_reached' };
  }
  if ((coupon.usage_limit_per_user ?? null) !== null && Number(ctx.user_previous_usage || 0) >= Number(coupon.usage_limit_per_user)) {
    return { ok: false, reason: 'per_user_limit_reached' };
  }
  if (Number(coupon.min_basket || 0) > Number(ctx.basket_total)) return { ok: false, reason: 'min_basket_not_met' };

  let discount = coupon.discount_type === 'percent'
    ? Math.round(((Number(ctx.basket_total) * coupon.value) / 100) * 100) / 100
    : Math.min(coupon.value, ctx.basket_total);
  if (coupon.max_discount_cap != null && coupon.discount_type === 'percent') {
    discount = Math.min(discount, Number(coupon.max_discount_cap));
  }
  return { ok: true, code: coupon.code, discount: Math.max(0, Math.round(discount * 100) / 100) };
}

// ── Controller ────────────────────────────────────────────────────────────

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCouponsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  private async auditCoupon(me: any, action: string, code: string, id: string, reason: string, data: any) {
    await this.audit.write({
      action, actor: me, target_type: 'coupon', target_id: id, reason,
      before: data.before ?? null, after: data.after ?? null,
    });
  }

  private get col() { return this.conn.collection('coupons'); }

  @Get()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async list(@Query('active') active?: string) {
    const q: any = {};
    if (active === 'true') q.active = true;
    if (active === 'false') q.active = false;
    return this.col.find(q).sort({ createdAt: -1 }).limit(200).project({ _id: 0 }).toArray();
  }

  @Post()
  async create(@Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const code = String(b?.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,24}$/.test(code)) throw new BadRequestException('code_format_4_to_24_alnum');
    if (await this.col.findOne({ code })) throw new ConflictException('code_exists');
    if (!['percent', 'amount'].includes(String(b?.discount_type))) throw new BadRequestException('discount_type_invalid');
    const value = Number(b?.value);
    if (!Number.isFinite(value) || value <= 0 || (b?.discount_type === 'percent' && value > 100)) throw new BadRequestException('value_invalid');

    const doc: any = {
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any): Promise<any> {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const before: any = await this.col.findOne({ id });
    if (!before) throw new NotFoundException('coupon_not_found');
    const $set: any = { updatedAt: new Date() };
    if (b?.active !== undefined) $set.active = !!b.active;
    if (b?.min_basket !== undefined) $set.min_basket = Math.max(0, Number(b.min_basket) || 0);
    if (b?.max_discount_cap !== undefined) $set.max_discount_cap = b.max_discount_cap == null ? null : Number(b.max_discount_cap);
    if (b?.usage_limit_total !== undefined) $set.usage_limit_total = b.usage_limit_total == null ? null : Number(b.usage_limit_total);
    if (b?.usage_limit_per_user !== undefined) $set.usage_limit_per_user = Number(b.usage_limit_per_user) || 1;
    if (b?.expires_at !== undefined) $set.expires_at = b.expires_at ? new Date(b.expires_at) : null;
    if (b?.segments !== undefined) $set.segments = Array.isArray(b.segments) ? b.segments.map(String) : [];
    if (b?.value !== undefined) {
      const v = Number(b.value);
      if (!Number.isFinite(v) || v <= 0 || (before.discount_type === 'percent' && v > 100)) throw new BadRequestException('value_invalid');
      $set.value = v;
    }
    await this.col.updateOne({ id }, { $set });
    await this.auditCoupon(me, 'coupon_update', before.code, id, reason, { before: { active: before.active, value: before.value }, after: $set });
    return this.col.findOne({ id }, { projection: { _id: 0 } });
  }

  /** Dry-run the deterministic engine against a hypothetical basket. */
  @Post('validate')
  async validate(@Body() b: any) {
    const code = String(b?.code || '').trim().toUpperCase();
    const basketTotal = Number(b?.basket_total ?? 0);
    if (!code || !Number.isFinite(basketTotal)) throw new BadRequestException('code_and_basket_required');
    const coupon: any = await this.col.findOne({ code });
    const userPrev = b?.user_id
      ? await this.conn.collection('coupon_redemptions').countDocuments({ code, user_id: String(b.user_id) })
      : 0;
    const result = applyCoupon(coupon, {
      basket_total: basketTotal, user_id: String(b?.user_id || 'anonymous'),
      user_previous_usage: userPrev,
    });
    return result;
  }

  /** Real redemption record (checkout calls this after order confirmation). */
  @Post('redeem')
  async redeem(@Body() b: any) {
    const code = String(b?.code || '').trim().toUpperCase();
    const userId = String(b?.user_id || '');
    const orderId = String(b?.order_id || '');
    if (!code || !userId) throw new BadRequestException('code_and_user_required');
    const res = await this.col.findOneAndUpdate(
      { code, $or: [{ usage_limit_total: null }, { $expr: { $lt: ['$used_count', '$usage_limit_total'] } }] },
      { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!res) throw new ConflictException('coupon_exhausted_or_missing');
    await this.conn.collection('coupon_redemptions').insertOne({ code, user_id: userId, order_id: orderId, redeemed_at: new Date() });
    return { ok: true, code, used_count: (res as any).used_count };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const before: any = await this.col.findOne({ id });
    if (!before) throw new NotFoundException('coupon_not_found');
    await this.col.deleteOne({ id });
    await this.auditCoupon(me, 'coupon_delete', before.code, id, reason, { before: { code: before.code, active: before.active } });
    return { ok: true };
  }
}
