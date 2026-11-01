/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   CENTRALIZED BUSINESS RULES ENGINE                            ║
 * ║   The ONLY place where pricing/insurance/eligibility/provider  ║
 * ║   acceptance rules live. Every domain MUST call validate()     ║
 * ║   before creating or transitioning a booking.                  ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { PAYMENT_METHODS_BY_CONTEXT } from '../../common/payment-policy';
import { Module, Controller, Post, Get, Body, UseGuards, Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { validateReason, MIN_FINANCIAL_REASON_LENGTH } from '../../common/rbac';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, ServiceDomain } from '../../common/enums';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { UpdateSurgeDto, UpdateFeesDto, ValidateRulesDto } from './business-rules.dto';

import { Permission, RequirePermissions } from '../../common/permissions';
export type RuleContext = {
  kind: ServiceDomain;
  patient?: { id?: string; age?: number; sex?: 'male' | 'female'; chronic?: string[] };
  insurance?: { provider?: string; policy_number?: string; eligible_services?: string[] };
  service?: { id?: string; key?: string; price?: number; min_age?: number; max_age?: number; sex_restriction?: 'male' | 'female' };
  provider?: { id?: string; user_id?: string; type?: string; accepted_insurance?: string[]; capabilities?: string[] };
  scheduled_at?: string | Date;
  location?: { lat?: number; lng?: number; city?: string };
  payment_method?: 'cash' | 'card' | 'insurance';
  service_context?: 'home_visit' | 'online_consultation' | 'in_clinic' | 'pharmacy_delivery';
};

/** B4: single VAT reader — admin finance config wins, 15% KSA default stands. */
export async function readVatRate(db: { collection: (name: string) => any }): Promise<number> {
  try {
    const cfg: any = await db.collection('finance_config').findOne({ key: 'commissions' });
    // tax.vat_percent is a percent (15); vat_rate, written by the old finance-suite form, is a fraction (0.15).
    // Reading vat_rate as a percent charged 0.15% VAT whenever tax.vat_percent was absent.
    const pct = Number(cfg?.tax?.vat_percent);
    if (cfg?.tax?.vat_percent !== undefined && Number.isFinite(pct) && pct >= 0 && pct <= 100) return pct / 100;
    const frac = Number(cfg?.vat_rate);
    if (cfg?.vat_rate !== undefined && Number.isFinite(frac) && frac >= 0 && frac <= 1) return frac;
  } catch { /* default stands */ }
  return 0.15;
}

export type RuleResult = {
  ok: boolean;
  final_price?: number;
  base_price?: number;
  tax?: number;
  insurance_discount?: number;
  surge_multiplier?: number;
  errors: string[];
  warnings: string[];
  meta: Record<string, any>;
};

@Injectable()
export class BusinessRulesService {
  constructor(
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectConnection() private conn: Connection,
  ) {}

  private surgeConfig = { startHour: 18, endHour: 22, multiplier: 1.1 };
  private feeDefaults = { delivery_fee: 0, service_fee: 0 };
  private pricingLoaded = false;

  /** P6.x-14: platform pricing config persists in system_configs key 'pricing'. */
  private async loadPricing() {
    if (this.pricingLoaded) return;
    this.pricingLoaded = true;
    try {
      const doc: any = await this.conn.collection('system_configs').findOne({ key: 'pricing' });
      const v = doc?.value || {};
      if (Number.isFinite(v.surge_startHour) && v.surge_startHour >= 0 && v.surge_startHour <= 23) this.surgeConfig.startHour = v.surge_startHour;
      if (Number.isFinite(v.surge_endHour) && v.surge_endHour >= 0 && v.surge_endHour <= 23) this.surgeConfig.endHour = v.surge_endHour;
      if (Number.isFinite(v.surge_multiplier) && v.surge_multiplier >= 1 && v.surge_multiplier <= 5) this.surgeConfig.multiplier = v.surge_multiplier;
      if (Number.isFinite(v.delivery_fee) && v.delivery_fee >= 0) this.feeDefaults.delivery_fee = v.delivery_fee;
      if (Number.isFinite(v.service_fee) && v.service_fee >= 0) this.feeDefaults.service_fee = v.service_fee;
    } catch { /* config optional — built-in defaults stand */ }
  }

  private async savePricing() {
    try {
      await this.conn.collection('system_configs').updateOne(
        { key: 'pricing' },
        { $set: { key: 'pricing', value: { surge_startHour: this.surgeConfig.startHour, surge_endHour: this.surgeConfig.endHour, surge_multiplier: this.surgeConfig.multiplier, ...this.feeDefaults }, updated_at: new Date() } },
        { upsert: true },
      );
    } catch { /* observability only */ }
  }
  
  getSurgeConfig() { return this.surgeConfig; }
  getPricing() { return { surge: this.surgeConfig, fees: this.feeDefaults }; }

  /** R6-4: fresh platform fees for quote paths (no stale cache — the live
   * check is "change a fee → the next quote shows it"). */
  async platformFees(): Promise<{ delivery_fee: number; service_fee: number }> {
    try {
      const doc: any = await this.conn.collection('system_configs').findOne({ key: 'pricing' });
      const v = doc?.value || {};
      return {
        delivery_fee: Number.isFinite(v.delivery_fee) && v.delivery_fee >= 0 ? v.delivery_fee : this.feeDefaults.delivery_fee,
        service_fee: Number.isFinite(v.service_fee) && v.service_fee >= 0 ? v.service_fee : this.feeDefaults.service_fee,
      };
    } catch {
      return { ...this.feeDefaults };
    }
  }
  async pricing() { await this.loadPricing(); return this.getPricing(); }

  /** B4: VAT and commission percents come from the admin-edited finance_config
   * commissions doc (POST /api/v1/admin/finance/commissions/config, the finance suite); code defaults
   * stand only when no config exists. */
  async financeConfig(): Promise<any> {
    try {
      return (await this.conn.collection('finance_config').findOne({ key: 'commissions' } as any)) || {};
    } catch {
      return {};
    }
  }

  async vatRate(): Promise<number> {
    return readVatRate(this.conn);
  }

  async commissionPercent(serviceType: string, fallback = 10): Promise<number> {
    const cfg = await this.financeConfig();
    const v = Number(cfg?.service_types?.[serviceType]?.percent);
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : fallback;
  }
  /** Who changed the pricing, why, and what it was before: one row in admin_actions_log (same shape as AdminAuditService). */
  private async auditPricing(action: string, ctx: { admin: any; reason: string }, before: any, after: any) {
    await this.conn.collection('admin_actions_log').insertOne({
      id: uuidv4(), action, admin_id: ctx.admin?.id || 'unknown', admin_name: ctx.admin?.full_name || ctx.admin?.email || null,
      admin_role: ctx.admin?.role || null, target_type: 'pricing_config', target_id: 'pricing', reason: ctx.reason,
      before, after, meta: null, ip: null, user_agent: null, createdAt: new Date(),
    } as any).catch(() => undefined);
  }

  async updateSurgeConfig(config: Omit<UpdateSurgeDto, 'reason'>, ctx?: { admin: any; reason: string }) {
    await this.loadPricing();
    const before = { ...this.surgeConfig };
    // Copy only finite, bounded numeric fields; never reflect body strings or
    // arbitrary properties into the response/config.
    const next = { ...this.surgeConfig };
    if (config.startHour !== undefined) {
      if (!Number.isFinite(config.startHour) || config.startHour < 0 || config.startHour > 23) throw new BadRequestException('startHour_out_of_range');
      next.startHour = config.startHour;
    }
    if (config.endHour !== undefined) {
      if (!Number.isFinite(config.endHour) || config.endHour < 0 || config.endHour > 23) throw new BadRequestException('endHour_out_of_range');
      next.endHour = config.endHour;
    }
    if (config.multiplier !== undefined) {
      if (!Number.isFinite(config.multiplier) || config.multiplier < 1 || config.multiplier > 5) throw new BadRequestException('multiplier_out_of_range');
      next.multiplier = config.multiplier;
    }
    this.surgeConfig = next;
    await this.savePricing();
    if (ctx) await this.auditPricing('pricing_surge_update', ctx, before, { ...next });
    return { ok: true };
  }

  /** P6.x-14: platform fee defaults (persisted; runtime consumers adopt per flow). */
  async updateFees(fees: { delivery_fee?: number; service_fee?: number }, ctx?: { admin: any; reason: string }) {
    await this.loadPricing();
    const before = { ...this.feeDefaults };
    if (fees.delivery_fee !== undefined) {
      if (!Number.isFinite(fees.delivery_fee) || fees.delivery_fee < 0 || fees.delivery_fee > 1000) throw new BadRequestException('delivery_fee_out_of_range');
      this.feeDefaults.delivery_fee = fees.delivery_fee;
    }
    if (fees.service_fee !== undefined) {
      if (!Number.isFinite(fees.service_fee) || fees.service_fee < 0 || fees.service_fee > 1000) throw new BadRequestException('service_fee_out_of_range');
      this.feeDefaults.service_fee = fees.service_fee;
    }
    await this.savePricing();
    if (ctx) await this.auditPricing('pricing_fees_update', ctx, before, { ...this.feeDefaults });
    return { ok: true, fees: this.feeDefaults };
  }

  // ─── INSURANCE VALIDATION ────────────────────────────────────────
  private validateInsurance(ctx: RuleContext, r: RuleResult) {
    if (!ctx.insurance?.provider) return;
    if (!ctx.provider) return;
    const accepted = (ctx.provider.accepted_insurance || []).map(x => String(x).toLowerCase());
    if (accepted.length === 0) {
      r.errors.push('provider_does_not_accept_any_insurance');
      r.ok = false; return;
    }
    if (!accepted.includes(String(ctx.insurance.provider).toLowerCase())) {
       r.errors.push('provider_does_not_accept_insurance');
      r.ok = false; return;
    }
    if (ctx.service?.key && ctx.insurance.eligible_services && !ctx.insurance.eligible_services.includes(ctx.service.key)) {
      r.warnings.push('service_not_in_insurance_eligible_list');
    }
    r.meta.insurance_validated = true;
  }

  // ─── ELIGIBILITY (age / sex / patient-side) ──────────────────────
  private validateEligibility(ctx: RuleContext, r: RuleResult) {
    if (!ctx.service || !ctx.patient) return;
    if (typeof ctx.service.min_age === 'number' && typeof ctx.patient.age === 'number' && ctx.patient.age < ctx.service.min_age) {
      r.errors.push(`patient_below_min_age_${ctx.service.min_age}`); r.ok = false;
    }
    if (typeof ctx.service.max_age === 'number' && typeof ctx.patient.age === 'number' && ctx.patient.age > ctx.service.max_age) {
      r.errors.push(`patient_above_max_age_${ctx.service.max_age}`); r.ok = false;
    }
    if (ctx.service.sex_restriction && ctx.patient.sex && ctx.service.sex_restriction !== ctx.patient.sex) {
      r.errors.push(`service_restricted_to_${ctx.service.sex_restriction}`); r.ok = false;
    }
  }

  // ─── PROVIDER ACCEPTANCE ────────────────────────────────────────
  private validateProviderAcceptance(ctx: RuleContext, r: RuleResult) {
    if (!ctx.provider) return;
    if (ctx.service?.key && ctx.provider.capabilities && ctx.provider.capabilities.length > 0) {
      const has = ctx.provider.capabilities.map(c => String(c).toLowerCase()).includes(String(ctx.service.key).toLowerCase());
      if (!has) { r.warnings.push('provider_capability_not_explicitly_listed'); }
    }
    const typeMap: Record<ServiceDomain, string[]> = {
      pharmacy: ['pharmacy'], lab: ['lab', 'hospital'], radiology: ['radiology', 'hospital'],
      nursing: ['home_care', 'hospital'], consultation: ['doctor', 'clinic', 'hospital'],
    };
    const allowed = typeMap[ctx.kind] || [];
    if (ctx.provider.type && allowed.length && !allowed.includes(ctx.provider.type)) {
      r.errors.push(`provider_type_mismatch:${ctx.provider.type}_for_${ctx.kind}`); r.ok = false;
    }
  }

  // ─── PRICING (base + tax + insurance discount + surge) ──────────
  private computePricing(ctx: RuleContext, r: RuleResult) {
    const base = ctx.service?.price ?? 0;
    const taxRate = 0.15; // KSA VAT
    const tax = Math.round(base * taxRate * 100) / 100;
    let insuranceDiscount = 0;
    if (ctx.insurance?.provider && r.meta.insurance_validated && r.ok) {
      // Flat 80% covered for insured services (simplified rule)
      insuranceDiscount = Math.round(base * 0.8 * 100) / 100;
    }
    // Surge: peak hours based on config
    let surge = 1;
    if (ctx.scheduled_at) {
      const h = new Date(ctx.scheduled_at).getHours();
      if (h >= this.surgeConfig.startHour && h <= this.surgeConfig.endHour) {
        surge = this.surgeConfig.multiplier;
      }
    }
    const subtotal = Math.max(0, base - insuranceDiscount);
    const finalPrice = Math.round((subtotal + tax) * surge * 100) / 100;
    r.base_price = base; r.tax = tax; r.insurance_discount = insuranceDiscount;
    r.surge_multiplier = surge; r.final_price = finalPrice;
  }

  // ─── PAYMENT METHOD RULES (Nabd Payment Policy) ─────────────────
  private validatePaymentMethod(ctx: RuleContext, r: RuleResult) {
    if (!ctx.payment_method) return;
    const sc = ctx.service_context;
    if (!sc) return;
    const allowedList: readonly string[] = PAYMENT_METHODS_BY_CONTEXT[sc] || ['cash', 'card', 'insurance'];
    if (!allowedList.includes(ctx.payment_method)) {
      r.errors.push(`payment_method_${ctx.payment_method}_not_allowed_for_${sc}`);
      r.ok = false;
    }
  }

  /** Single entry-point — every domain calls this before booking/transition. */
  async validate(ctx: RuleContext): Promise<RuleResult> {
    await this.loadPricing();
    const r: RuleResult = { ok: true, errors: [], warnings: [], meta: {} };
    // Hydrate provider if only id provided. user_id is DTO-validated as a
    // string and pinned with $eq so query operators can never be injected.
    if (ctx.provider?.user_id && !ctx.provider.type) {
      const p = await this.providers.findOne({ user_id: { $eq: ctx.provider.user_id } }, { type: 1, accepted_insurance: 1, nursing_services: 1, test_categories: 1, equipment_list: 1, _id: 0 }).lean();
      if (p) {
        ctx.provider.type = (p as any).type;
        ctx.provider.accepted_insurance = (p as any).accepted_insurance || [];
        ctx.provider.capabilities = [
          ...((p as any).nursing_services || []).map((n: any) => n.key),
          ...((p as any).test_categories || []),
          ...((p as any).equipment_list || []),
        ];
      }
    }
    this.validateProviderAcceptance(ctx, r);
    this.validateInsurance(ctx, r);
    this.validateEligibility(ctx, r);
    this.validatePaymentMethod(ctx, r);
    this.computePricing(ctx, r);
    return r;
  }
}

@Controller('business-rules')
@UseGuards(JwtAuthGuard)
export class BusinessRulesController {
  constructor(private svc: BusinessRulesService) {}
  
  @Get('config/surge')
  getSurge() { return this.svc.getSurgeConfig(); }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Post('config/surge')
  updateSurge(@Body() body: UpdateSurgeDto, @CurrentUser() admin: any) {
    const { reason, ...rest } = body;
    return this.svc.updateSurgeConfig(rest, { admin, reason: validateReason(reason, MIN_FINANCIAL_REASON_LENGTH) });
  }

  /** P6.x-14: platform pricing (surge + fee defaults, persisted). */
  @Roles(UserRole.ADMIN)
  @Get('config/pricing')
  pricing() { return this.svc.pricing(); }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Post('config/fees')
  updateFees(@Body() body: UpdateFeesDto, @CurrentUser() admin: any) {
    const { reason, ...rest } = body;
    return this.svc.updateFees(rest, { admin, reason: validateReason(reason, MIN_FINANCIAL_REASON_LENGTH) });
  }

  @SelfService()
  @Post('validate') validate(@Body() body: ValidateRulesDto) { return this.svc.validate(body); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'ProviderProfile', schema: ProviderProfileSchema }])],
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService],
  exports: [BusinessRulesService],
})
export class BusinessRulesModule {}
