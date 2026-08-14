import { Module, Controller, Post, Get, Body, Query, UseGuards, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, Public } from '../../common/auth.guard';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { ProviderProfile, ProviderProfileDocument, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { EventBusService } from '../events/event-bus.service';
import * as bcrypt from 'bcryptjs';

/**
 * Unified Provider Onboarding Wizard.
 * 3 sequential steps to register/upgrade any provider type:
 *   Step 1: pick type (pharmacy|lab|radiology|doctor|clinic|hospital|nursing)
 *   Step 2: general info (name, location, license, coverage, insurance)
 *   Step 3: type-specific capabilities (services, schedule, equipment, roster, ...)
 *
 * Then admin review queue (existing /providers admin endpoints) approves.
 */
@Injectable()
export class ProviderOnboardingService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('ProviderProfile') private providerModel: Model<ProviderProfileDocument>,
    private bus: EventBusService,
  ) {}

  private typeToRole(type: ProviderType): UserRole {
    return {
      [ProviderType.DOCTOR]: UserRole.DOCTOR,
      [ProviderType.PHARMACY]: UserRole.PHARMACY,
      [ProviderType.HOSPITAL]: UserRole.HOSPITAL,
      [ProviderType.CLINIC]: UserRole.HOSPITAL,
      [ProviderType.LAB]: UserRole.LAB,
      [ProviderType.RADIOLOGY]: UserRole.RADIOLOGY,
      [ProviderType.HOME_CARE]: UserRole.HOME_CARE,
    }[type];
  }

  /** Initialize wizard (or fetch in-progress). Public, must have phone+password OR existing user. */
  async start(body: { phone: string; password?: string; full_name?: string; email?: string; type: ProviderType }) {
    if (!body.type || !Object.values(ProviderType).includes(body.type)) throw new BadRequestException('invalid_type');
    if (!body.phone) throw new BadRequestException('phone_required');
    let user = await this.userModel.findOne({ phone: body.phone });
    if (!user) {
      if (!body.password) throw new BadRequestException('password_required_for_new_user');
      const hash = await bcrypt.hash(body.password, 8);
      try {
        user = await this.userModel.create({
          phone: body.phone, full_name: body.full_name || body.phone,
          email: body.email, password_hash: hash,
          role: this.typeToRole(body.type), active: true,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          throw new BadRequestException('البريد الإلكتروني أو رقم الجوال مسجل مسبقاً / Email or phone already registered');
        }
        throw err;
      }
    }
    let profile = await this.providerModel.findOne({ user_id: user.id });
    if (!profile) {
      profile = await this.providerModel.create({
        user_id: user.id, account_id: user.id, type: body.type, status: ProviderStatus.PENDING,
        name_ar: body.full_name || 'Provider', onboarding_step: 1,
      });
    } else if (profile.type !== body.type) {
      profile.type = body.type; profile.onboarding_step = 1;
      await profile.save();
    }
    this.bus.emit({ type: 'onboarding.started', entity_type: 'provider', entity_id: profile.id, actor_account_id: user.id, actor_role: 'provider', meta: { type: body.type } }).catch(() => null);
    return { ok: true, user_id: user.id, profile_id: profile.id, type: profile.type, step: profile.onboarding_step };
  }

  /** Step 2: general info. Requires auth from wizard-started user. */
  async step2(user: any, body: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id });
    if (!profile) throw new NotFoundException('profile_not_started');
    const fields = ['name_ar', 'name_en', 'city', 'district', 'address', 'location', 'license_number', 'license_documents', 'coverage_radius_km', 'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'bio', 'languages', 'iban', 'bank_account_name', 'pharmacy_type', 'cr_number', 'moh_license_number', 'sfda_license_number', 'tax_number'];
    for (const f of fields) if (body[f] !== undefined) (profile as any)[f] = body[f];
    profile.onboarding_step = Math.max(profile.onboarding_step || 0, 2);
    await profile.save();
    return profile.toObject();
  }

  /** Step 3: type-specific capabilities. */
  async step3(user: any, body: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id });
    if (!profile) throw new NotFoundException('profile_not_started');
    const allowed: Record<ProviderType, string[]> = {
      [ProviderType.DOCTOR]: [
        'specialty', 'sub_specialties', 'title', 'academic_degree', 'years_experience',
        'consultation_modes', 'price_clinic', 'price_online', 'price_home',
        'consultation_fee', 'online_consultation_fee', 'home_visit_fee',
        'hospital', 'working_hours', 'accepts_insurance', 'accepted_insurance',
        'insurance_clinic', 'insurance_online', 'insurance_home',
        'coverage_radius_km', 'home_visit_supported',
      ],
      [ProviderType.HOSPITAL]: [
        'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
      ],
      [ProviderType.CLINIC]: [
        'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
      ],
      [ProviderType.LAB]: [
        'test_categories', 'home_visit_supported', 'home_visit_radius_km',
        'gender_pref', 'working_hours', 'accepts_insurance', 'accepted_insurance',
        'accepts_cash', 'nursing_services', 'consultation_modes', 'price_clinic', 'price_home'
      ],
      [ProviderType.RADIOLOGY]: [
        'equipment_list', 'home_visit_supported', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'test_categories', 'consultation_modes', 'price_clinic', 'price_home',
        'radiation_safety_license', 'available_equipment_text'
      ],
      [ProviderType.PHARMACY]: [
        'pharmacy_chain', 'has_own_drivers', 'delivery_radius_km',
        'has_own_delivery', 'working_hours', 'accepts_insurance', 'accepted_insurance',
        'accepts_cash', 'coverage_radius_km', 'delivery_fee', 'free_delivery_above',
        'min_order_sar', 'express_delivery', 'express_fee', 'express_minutes',
        'rx_dispensing', 'otc_selling', 'enabled_categories'
      ],
      [ProviderType.HOME_CARE]: [
        'nursing_services', 'home_visit_radius_km', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
        'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth'
      ],
      [ProviderType.NURSING]: [
        'nursing_services', 'home_visit_radius_km', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
        'coverage_radius_km', 'home_visit_supported',
        'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth'
      ],
    };
    const keys = allowed[profile.type] || [];
    for (const k of keys) if (body[k] !== undefined) (profile as any)[k] = body[k];
    profile.onboarding_step = Math.max(profile.onboarding_step || 0, 3);
    await profile.save();
    return profile.toObject();
  }

  /** Submit for admin review. Locks profile in PENDING. */
  async submit(user: any, body?: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id });
    if (!profile) throw new NotFoundException();
    if ((profile.onboarding_step || 0) < 3) throw new BadRequestException('complete_all_steps_first');
    profile.onboarding_completed = true;
    profile.status = ProviderStatus.PENDING;
    if (body) {
      if (body.signer_name) profile.signer_name = body.signer_name;
      if (body.signer_role) profile.signer_role = body.signer_role;
      if (body.signature_url) profile.signature_url = body.signature_url;
    }
    await profile.save();
    this.bus.emit({ type: 'provider.submitted_for_review', entity_type: 'provider', entity_id: profile.id, actor_account_id: user.id, actor_role: 'provider', meta: { type: profile.type } }).catch(() => null);
    return profile.toObject();
  }

  async getProgress(user: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id }, { _id: 0, __v: 0 });
    if (!profile) return { started: false };
    return { started: true, ...profile.toObject() };
  }

  /**
   * UNIFIED SEARCH: query providers by service intent, not by name.
   * Searches across providers + their catalog services + capability blocks.
   */
  async unifiedSearch(q: { service?: string; type?: ProviderType; city?: string; home_visit?: boolean; insurance?: string }) {
    const filter: any = { status: ProviderStatus.ACTIVE };
    if (q.type) filter.type = q.type;
    if (q.city) filter.city = q.city;
    if (q.home_visit === true) filter.home_visit_supported = true;
    if (q.insurance) filter.accepted_insurance = q.insurance;
    if (q.service) {
      const re = new RegExp(q.service, 'i');
      filter.$or = [
        { name_ar: re },
        { name_en: re },
        { specialty: re },
        { sub_specialties: re },
        { test_categories: re },
        { equipment_list: re },
        { 'doctors_roster.specialty': re },
        { 'doctors_roster.name': re },
        { 'nursing_services.name_ar': re },
        { 'nursing_services.name_en': re },
      ];
    }
    const list = await this.providerModel.find(filter, { _id: 0, __v: 0, license_documents: 0 }).sort({ rating: -1 }).limit(80).lean();
    return list.map((p: any) => ({
      ...p,
      matched_capabilities: this.summarizeCaps(p, q.service),
    }));
  }

  private summarizeCaps(p: any, query?: string): string[] {
    const out: string[] = [];
    const test = (s?: string) => !query || (s && s.toLowerCase().includes(query.toLowerCase()));
    if (p.specialty && test(p.specialty)) out.push(`specialty:${p.specialty}`);
    for (const cat of p.test_categories || []) if (test(cat)) out.push(`test:${cat}`);
    for (const eq of p.equipment_list || []) if (test(eq)) out.push(`equipment:${eq}`);
    for (const d of p.doctors_roster || []) if (test(d.name) || test(d.specialty)) out.push(`doctor:${d.name}`);
    for (const ns of p.nursing_services || []) if (test(ns.name_ar) || test(ns.name_en)) out.push(`nursing:${ns.name_ar}`);
    return out;
  }
}

@Controller('provider-onboarding')
export class ProviderOnboardingController {
  constructor(private svc: ProviderOnboardingService) {}

  @Public() @Post('start')
  start(@Body() b: any) { return this.svc.start(b); }

  @UseGuards(JwtAuthGuard) @Post('step2')
  step2(@CurrentUser() u: any, @Body() b: any) { return this.svc.step2(u, b); }

  @UseGuards(JwtAuthGuard) @Post('step3')
  step3(@CurrentUser() u: any, @Body() b: any) { return this.svc.step3(u, b); }

  @UseGuards(JwtAuthGuard) @Post('submit')
  submit(@CurrentUser() u: any, @Body() b: any) { return this.svc.submit(u, b); }

  @UseGuards(JwtAuthGuard) @Get('progress')
  progress(@CurrentUser() u: any) { return this.svc.getProgress(u); }
}

@Controller('search')
export class UnifiedSearchController {
  constructor(private svc: ProviderOnboardingService) {}

  @Public() @Get('providers')
  search(@Query() q: any) {
    return this.svc.unifiedSearch({
      service: q.service || q.q,
      type: q.type,
      city: q.city,
      home_visit: q.home_visit === 'true' || q.home_visit === '1',
      insurance: q.insurance,
    });
  }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'User', schema: UserSchema },
    { name: 'ProviderProfile', schema: ProviderProfileSchema },
  ])],
  controllers: [ProviderOnboardingController, UnifiedSearchController],
  providers: [ProviderOnboardingService],
  exports: [ProviderOnboardingService],
})
export class ProviderOnboardingModule {}
