/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   CENTRALIZED BUSINESS RULES ENGINE                            ║
 * ║   The ONLY place where pricing/insurance/eligibility/provider  ║
 * ║   acceptance rules live. Every domain MUST call validate()     ║
 * ║   before creating or transitioning a booking.                  ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Post, Get, Body, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ServiceDomain } from '../../common/enums';

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
  constructor(@InjectModel('ProviderProfile') private providers: Model<any>) {}

  private surgeConfig = { startHour: 18, endHour: 22, multiplier: 1.1 };
  
  getSurgeConfig() { return this.surgeConfig; }
  updateSurgeConfig(config: any) { this.surgeConfig = { ...this.surgeConfig, ...config }; return this.surgeConfig; }

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
      r.errors.push(`provider_does_not_accept_${ctx.insurance.provider}`);
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
    const allowed: Record<NonNullable<RuleContext['service_context']>, Array<'cash'|'card'|'insurance'>> = {
      home_visit: ['card', 'insurance'],
      online_consultation: ['card'],
      in_clinic: ['cash', 'card', 'insurance'],
      pharmacy_delivery: ['cash', 'card', 'insurance'],
    };
    const allowedList = allowed[sc] || ['cash', 'card', 'insurance'];
    if (!allowedList.includes(ctx.payment_method)) {
      r.errors.push(`payment_method_${ctx.payment_method}_not_allowed_for_${sc}`);
      r.ok = false;
    }
  }

  /** Single entry-point — every domain calls this before booking/transition. */
  async validate(ctx: RuleContext): Promise<RuleResult> {
    const r: RuleResult = { ok: true, errors: [], warnings: [], meta: {} };
    // Hydrate provider if only id provided
    if (ctx.provider?.user_id && !ctx.provider.type) {
      const p = await this.providers.findOne({ user_id: ctx.provider.user_id }, { type: 1, accepted_insurance: 1, nursing_services: 1, test_categories: 1, equipment_list: 1, _id: 0 }).lean();
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

  @Post('config/surge')
  updateSurge(@Body() body: any) { return this.svc.updateSurgeConfig(body); }

  @Post('validate') validate(@Body() ctx: RuleContext) { return this.svc.validate(ctx); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'ProviderProfile', schema: ProviderProfileSchema }])],
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService],
  exports: [BusinessRulesService],
})
export class BusinessRulesModule {}
