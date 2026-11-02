import { BadRequestException, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { IsDefined, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { Permission, RequirePermissions } from '../../../common/permissions';
import { MIN_FINANCIAL_REASON_LENGTH, validateReason } from '../../../common/rbac';
import { recordAudit } from '../../../common/audit-record';
import { commissionServiceTypeOf } from '../../../common/commission-defaults';
import { PROMO_COLLECTION, parsePromoInput, promoState } from '../../../common/commission-promo';
import { CommissionResolver } from '../../finance-engine/finance-engine.module';

export class ProviderCommissionDto {
  /** the commission for a cash payment, 0..100 (an insured visit follows `insurance` when it is sent, else this) */
  @IsOptional() @IsNumber() @Min(0) @Max(100) cash?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) insurance?: number;
  @IsDefined() @IsString() reason: string;
}

export class ProviderPromoDto {
  @IsDefined() @IsNumber() @Min(0) @Max(100) percent: number;
  /** `YYYY-MM-DD` (Saudi day) or an ISO instant; default: now */
  @IsOptional() @IsString() starts_at?: string;
  @IsOptional() @IsString() ends_at?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) max_orders?: number;
  @IsOptional() @IsString() note?: string;
  @IsDefined() @IsString() reason: string;
}

export class ReasonDto { @IsDefined() @IsString() reason: string; }

/**
 * The commission of ONE provider, as the admin sets and reads it. Two things drive the settlement (CommissionResolver):
 *  - the provider's own commission (`provider_profiles.commission_cash_pct` / `commission_insurance_pct`), replacing the type default;
 *  - a promotion (`provider_commission_promos`): X% (0 allowed) between two dates, or for the first N completed orders, then the normal
 *    commission applies again by itself.
 * Every change is written to the audit trail with its reason.
 */
@Injectable()
export class ProviderCommissionService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async profile(providerId: string): Promise<any> {
    const p: any = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ account_id: providerId }, { user_id: providerId }] },
      { projection: { _id: 0, account_id: 1, user_id: 1, type: 1, name_ar: 1, commission_cash_pct: 1, commission_insurance_pct: 1 } },
    );
    if (!p) throw new NotFoundException('provider_not_found');
    return p;
  }

  private promoView(p: any, now: Date) {
    return {
      id: p.id, percent: p.percent, starts_at: p.starts_at ?? null, ends_at: p.ends_at ?? null, max_orders: p.max_orders ?? null,
      used_orders: p.used_orders ?? 0, orders_left: p.max_orders != null ? Math.max(0, p.max_orders - (p.used_orders ?? 0)) : null,
      state: promoState({ ...p, max_orders: p.max_orders ?? null }, now), note: p.note ?? null, created_by: p.created_by ?? null, createdAt: p.createdAt ?? null,
    };
  }

  /** What the provider is charged right now (cash and insured), where it comes from, the override, and every promotion with its state. */
  async view(providerId: string, now = new Date()) {
    const p = await this.profile(providerId);
    const account = p.account_id || providerId;
    const service = commissionServiceTypeOf(p.type);
    const resolver = new CommissionResolver(this.conn);
    const [cash, insurance] = await Promise.all([
      resolver.resolve(service, { providerId: account, paymentMethod: 'cash', now }),
      resolver.resolve(service, { providerId: account, paymentMethod: 'insurance', now }),
    ]);
    const promos: any[] = await this.conn.collection(PROMO_COLLECTION).find({ provider_account_id: account } as any, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
    return {
      provider_id: account, type: p.type ?? null, service_type: service,
      override: { cash: p.commission_cash_pct ?? null, insurance: p.commission_insurance_pct ?? null },
      effective: { cash: { percent: cash.percent, source: cash.source }, insurance: { percent: insurance.percent, source: insurance.source } },
      promos: promos.map((x) => this.promoView(x, now)),
    };
  }

  async setOverride(admin: any, providerId: string, body: { cash?: number; insurance?: number; reason: unknown }) {
    const reason = validateReason(body?.reason, MIN_FINANCIAL_REASON_LENGTH);
    const pct = (v: unknown) => (v === undefined || v === null ? undefined : Number(v));
    const cash = pct(body.cash); const ins = pct(body.insurance);
    for (const v of [cash, ins]) if (v !== undefined && !(Number.isFinite(v) && v >= 0 && v <= 100)) throw new BadRequestException('percent_out_of_range');
    if (cash === undefined && ins === undefined) throw new BadRequestException('nothing_to_update');
    const p = await this.profile(providerId);
    const account = p.account_id || providerId;
    const set: Record<string, number> = {};
    // the same figure for an insured visit unless one is sent: a single "commission" field sets both
    if (cash !== undefined) { set.commission_cash_pct = cash; set.commission_rate = cash; if (ins === undefined) set.commission_insurance_pct = cash; }
    if (ins !== undefined) set.commission_insurance_pct = ins;
    await this.conn.collection('provider_profiles').updateOne({ account_id: account }, { $set: set });
    await recordAudit(this.conn, {
      action: 'provider_commission_override_set', user_id: admin?.id, role: admin?.role, resource_kind: 'provider_commission', resource_id: account, reason, severity: 'warn',
      changes: { before: { cash: p.commission_cash_pct ?? null, insurance: p.commission_insurance_pct ?? null }, after: { cash: set.commission_cash_pct ?? p.commission_cash_pct ?? null, insurance: set.commission_insurance_pct ?? p.commission_insurance_pct ?? null } },
    });
    return this.view(account);
  }

  /** Removes the provider's own commission: the type default applies again. */
  async clearOverride(admin: any, providerId: string, rawReason: unknown) {
    const reason = validateReason(rawReason, MIN_FINANCIAL_REASON_LENGTH);
    const p = await this.profile(providerId);
    const account = p.account_id || providerId;
    await this.conn.collection('provider_profiles').updateOne({ account_id: account }, { $unset: { commission_cash_pct: '', commission_insurance_pct: '' } });
    await recordAudit(this.conn, {
      action: 'provider_commission_override_cleared', user_id: admin?.id, role: admin?.role, resource_kind: 'provider_commission', resource_id: account, reason, severity: 'warn',
      changes: { before: { cash: p.commission_cash_pct ?? null, insurance: p.commission_insurance_pct ?? null }, after: { cash: null, insurance: null } },
    });
    return this.view(account);
  }

  /** Sets the provider's promotion; one at a time: a running or scheduled one is cancelled first. */
  async setPromo(admin: any, providerId: string, body: any) {
    const reason = validateReason(body?.reason, MIN_FINANCIAL_REASON_LENGTH);
    const parsed = parsePromoInput(body);
    if (parsed.ok === false) throw new BadRequestException(parsed.error);
    const p = await this.profile(providerId);
    const account = p.account_id || providerId;
    const now = new Date();
    const v = parsed.value;
    await this.conn.collection(PROMO_COLLECTION).updateMany({ provider_account_id: account, active: { $ne: false } } as any, { $set: { active: false, cancelled_at: now, cancelled_by: admin?.id ?? null } } as any);
    const doc = {
      id: `promo_${randomUUID()}`, provider_account_id: account, percent: v.percent, starts_at: v.starts_at, ends_at: v.ends_at,
      max_orders: v.max_orders, used_orders: 0, active: true, note: v.note, created_by: admin?.id ?? null, createdAt: now, updatedAt: now,
    };
    await this.conn.collection(PROMO_COLLECTION).insertOne(doc as any);
    await recordAudit(this.conn, {
      action: 'provider_commission_promo_set', user_id: admin?.id, role: admin?.role, resource_kind: 'provider_commission_promo', resource_id: doc.id, reason, severity: 'warn',
      details: { provider_account_id: account, percent: v.percent, starts_at: v.starts_at, ends_at: v.ends_at, max_orders: v.max_orders },
    });
    return this.view(account, now);
  }

  async cancelPromo(admin: any, providerId: string, rawReason: unknown) {
    const reason = validateReason(rawReason, MIN_FINANCIAL_REASON_LENGTH);
    const p = await this.profile(providerId);
    const account = p.account_id || providerId;
    const res: any = await this.conn.collection(PROMO_COLLECTION).updateMany({ provider_account_id: account, active: { $ne: false } } as any, { $set: { active: false, cancelled_at: new Date(), cancelled_by: admin?.id ?? null } } as any);
    await recordAudit(this.conn, {
      action: 'provider_commission_promo_cancelled', user_id: admin?.id, role: admin?.role, resource_kind: 'provider_commission_promo', resource_id: account, reason, severity: 'warn',
      details: { provider_account_id: account, cancelled: res?.modifiedCount ?? res?.matchedCount ?? 0 },
    });
    return this.view(account);
  }
}

@Controller('admin/provider-commissions')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ProviderCommissionsController {
  constructor(private readonly svc: ProviderCommissionService) {}

  @Get(':providerId') view(@Param('providerId') id: string) { return this.svc.view(id); }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Put(':providerId') set(@CurrentUser() u: any, @Param('providerId') id: string, @Body() b: ProviderCommissionDto) { return this.svc.setOverride(u, id, b); }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Delete(':providerId') clear(@CurrentUser() u: any, @Param('providerId') id: string, @Body() b: ReasonDto) { return this.svc.clearOverride(u, id, b?.reason); }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Put(':providerId/promo') promo(@CurrentUser() u: any, @Param('providerId') id: string, @Body() b: ProviderPromoDto) { return this.svc.setPromo(u, id, b); }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Delete(':providerId/promo') cancel(@CurrentUser() u: any, @Param('providerId') id: string, @Body() b: ReasonDto) { return this.svc.cancelPromo(u, id, b?.reason); }
}
