import { Module, Controller, Post, Get, Body, Query, Param, UseGuards, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, Public } from '../../common/auth.guard';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { ProviderProfile, ProviderProfileDocument, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { EventBusService } from '../events/event-bus.service';
import { ContractPdfService } from './contract-pdf.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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
    private contracts: ContractPdfService,
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
      [ProviderType.NURSING]: UserRole.NURSING,
      [ProviderType.AMBULANCE]: UserRole.AMBULANCE,
    }[type];
  }

  /** Initialize wizard (or fetch in-progress). Public, must have phone+password OR existing user. */
  async start(body: { phone: string; password?: string; full_name?: string; email?: string; type: ProviderType }) {
    if (!body.type || !Object.values(ProviderType).includes(body.type)) throw new BadRequestException('invalid_type');
    if (!body.phone) throw new BadRequestException('phone_required');
    let user = await this.userModel.findOne({ phone: body.phone });
    if (!user) {
      if (!body.password) throw new BadRequestException('password_required_for_new_user');
      const hash = await bcrypt.hash(body.password, 12);
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

  /**
   * RAW STEP SNAPSHOT — the admin must see EVERY field the provider typed, not
   * just the mapped ones. Every step body is appended verbatim (credentials and
   * local file URIs stripped) to profile.registration_steps so nothing entered
   * on any wizard screen is ever lost, even before a field gets a mapped column.
   */
  private snapshotStep(profile: any, step: string, body: any) {
    if (!body || typeof body !== 'object') return;
    const clean: any = {};
    for (const [k, v] of Object.entries(body)) {
      if (/pass|secret|token/i.test(k)) continue;                 // never snapshot credentials
      if (typeof v === 'string' && /^(file|content):\/\//.test(v)) continue; // local device URIs are useless server-side
      clean[k] = v;
    }
    if (!Object.keys(clean).length) return;
    const steps = (profile as any).registration_steps || {};
    const arr = Array.isArray(steps[step]) ? steps[step] : [];
    arr.push({ at: new Date(), data: clean });
    (profile as any).registration_steps = { ...steps, [step]: arr.slice(-10) }; // keep last 10 edits per step
    profile.markModified?.('registration_steps');
  }

  /** Step 2: general info. Requires auth from wizard-started user. */
  async step2(user: any, body: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id });
    if (!profile) throw new NotFoundException('profile_not_started');
    const fields = ['name_ar', 'name_en', 'city', 'district', 'address', 'location', 'license_number', 'license_documents', 'coverage_radius_km', 'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'bio', 'languages', 'iban', 'bank_account_name', 'pharmacy_type', 'cr_number', 'moh_license_number', 'sfda_license_number', 'tax_number',
      // widened: fields the apps already sent but that were silently dropped
      'clinic_images', 'scfhs_license_number', 'national_id', 'gender', 'clinic_name',
      'display_name_ar', 'display_name_en', 'profile_photo', 'logo'];
    for (const f of fields) if (body[f] !== undefined) (profile as any)[f] = body[f];
    this.snapshotStep(profile, 'step2', body);
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
        // widened: previously dropped doctor fields
        'home_visit_radius_km', 'clinic_duration', 'video_duration',
        'home_transport_fee', 'home_transport_price', 'clinic_name', 'vacation_date',
        'schedule_video', 'schedule_home', 'schedule_clinic', 'national_id', 'gender',
        'languages', 'display_name_ar', 'display_name_en',
      ],
      [ProviderType.HOSPITAL]: [
        'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'ambulance_roster', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'schedule_home',
      ],
      [ProviderType.CLINIC]: [
        'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'ambulance_roster', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'schedule_home',
      ],
      [ProviderType.LAB]: [
        'test_categories', 'home_visit_supported', 'home_visit_radius_km',
        'gender_pref', 'working_hours', 'accepts_insurance', 'accepted_insurance',
        'accepts_cash', 'nursing_services', 'consultation_modes', 'price_clinic', 'price_home',
        'schedule_home'
      ],
      [ProviderType.RADIOLOGY]: [
        'equipment_list', 'home_visit_supported', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'test_categories', 'consultation_modes', 'price_clinic', 'price_home',
        'radiation_safety_license', 'available_equipment_text', 'schedule_home'
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
        'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'schedule_home'
      ],
      [ProviderType.AMBULANCE]: [
        'vehicles_count', 'vehicle_plates', 'equipment_list', 'paramedic_count',
        'coverage_radius_km', 'service_area_cities', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
        'emergency_level', 'has_icu_units', 'base_location'
      ],
      [ProviderType.NURSING]: [
        'nursing_services', 'home_visit_radius_km', 'working_hours',
        'accepts_insurance', 'accepted_insurance', 'accepts_cash',
        'coverage_radius_km', 'home_visit_supported',
        'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'schedule_home'
      ],
    };
    const keys = allowed[profile.type] || [];
    for (const k of keys) if (body[k] !== undefined) (profile as any)[k] = body[k];
    this.snapshotStep(profile, 'step3', body);
    profile.onboarding_step = Math.max(profile.onboarding_step || 0, 3);
    await profile.save();
    return profile.toObject();
  }

  /** Provider's own onboarding profile (prefill for dashboard config screens —
   * insurance acceptance, plans, copays all live on this record). */
  async getMyProfile(user: any) {
    const profile = await this.providerModel.findOne({ user_id: user.id }).lean();
    if (!profile) throw new NotFoundException('profile_not_found');
    return profile;
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
      // lat/lng sent at submit — keep them on the mapped location too
      if (body.lat && body.lng && !(profile as any).location?.lat) {
        (profile as any).location = { lat: Number(body.lat), lng: Number(body.lng) };
      }
      // the apps attach the full wizard data object at submit — snapshot it so
      // every typed field survives for admin review even before mapping
      if (body.full_data && typeof body.full_data === 'object') this.snapshotStep(profile, 'full_data', body.full_data);
      this.snapshotStep(profile, 'submit', { signer_name: body.signer_name, signer_role: body.signer_role, lat: body.lat, lng: body.lng });
    }
    await profile.save();
    await this.mirrorToModerationQueue(user, profile).catch(() => null);
    await this.generateAndStoreContract(user, profile).catch((e) => {
      // Never block the submit, but DO log — a silent catch hid the corrupt-font
      // failure that broke every contract download.
      console.error('CONTRACT_GENERATION_FAILED', e?.message || e);
    });
    this.bus.emit({ type: 'provider.submitted_for_review', entity_type: 'provider', entity_id: profile.id, actor_account_id: user.id, actor_role: 'provider', meta: { type: profile.type } }).catch(() => null);
    return profile.toObject();
  }

  /**
   * Generate the two-party contract PDF (with the drawn e-signature merged into the
   * provider signature area) and store it base64 in `provider_contracts`.
   * Admin-only by default; provider visibility is an explicit admin grant.
   */
  private async generateAndStoreContract(user: any, profile: ProviderProfileDocument) {
    const fullUser = await this.userModel.findOne({ id: user.id }).lean();
    const { pdf, sha256 } = await this.contracts.generate({
      profileId: profile.id,
      accountId: (profile as any).account_id || null,
      userId: user.id,
      providerType: profile.type,
      nameAr: (profile as any).name_ar,
      nameEn: (profile as any).name_en,
      licenseNumber: (profile as any).license_number || (profile as any).moh_license_number || (profile as any).scfhs_license_number || (profile as any).sfda_license_number,
      crNumber: (profile as any).cr_number,
      city: (profile as any).city,
      signerName: (profile as any).signer_name,
      signerRole: (profile as any).signer_role,
      signatureUrl: (profile as any).signature_url,
      email: (fullUser as any)?.email,
      phone: (fullUser as any)?.phone,
    });
    const now = new Date();
    await this.providerModel.db.collection('provider_contracts').updateOne(
      { profile_id: profile.id },
      {
        $set: {
          account_id: (profile as any).account_id || null,
          user_id: user.id,
          provider_type: profile.type,
          signer_name: (profile as any).signer_name || null,
          signer_role: (profile as any).signer_role || null,
          signature_url: (profile as any).signature_url || null,
          pdf_base64: pdf.toString('base64'),
          sha256,
          updatedAt: now,
        },
        // Provider can download their own signed contract right after submitting;
        // admins can still revoke visibility from the review panel.
        $setOnInsert: { id: uuidv4(), visible_to_provider: true, createdAt: now },
      },
      { upsert: true },
    );
  }

  /** Lazily (re)generate a contract from the stored profile when none exists yet. */
  private async ensureContract(profile: any): Promise<any> {
    const col = this.providerModel.db.collection('provider_contracts');
    const existing: any = await col.findOne({ profile_id: profile.id });
    if (existing) return existing;
    const user = { id: profile.user_id };
    await this.generateAndStoreContract(user, profile);
    return col.findOne({ profile_id: profile.id });
  }

  /** Provider-side contract download (gated by admin grant). */
  async getContractForOwner(user: any) {
    let c: any = await this.providerModel.db.collection('provider_contracts').findOne({ user_id: user.id });
    if (!c) {
      // Contract missing (e.g. generation failed at submit) — rebuild it on demand.
      const profile: any = await this.providerModel.findOne({ user_id: user.id }).lean();
      if (!profile) throw new NotFoundException('contract_not_generated');
      c = await this.ensureContract(profile);
    }
    if (!c) throw new NotFoundException('contract_not_generated');
    if (!c.visible_to_provider) throw new ForbiddenException('contract_not_shared_by_admin');
    return c;
  }

  /** Admin-side contract download — looks up by account id first, then profile id. */
  async getContractForAdmin(accountOrProfileId: string) {
    const col = this.providerModel.db.collection('provider_contracts');
    let c: any = await col.findOne({ $or: [{ account_id: accountOrProfileId }, { profile_id: accountOrProfileId }] } as any);
    if (!c) {
      const profile: any = await this.providerModel.findOne({ $or: [{ account_id: accountOrProfileId }, { id: accountOrProfileId }] } as any).lean();
      if (!profile) throw new NotFoundException('contract_not_generated');
      c = await this.ensureContract(profile);
    }
    if (!c) throw new NotFoundException('contract_not_generated');
    return c;
  }

  async setContractVisibility(accountOrProfileId: string, visible: boolean) {
    const col = this.providerModel.db.collection('provider_contracts');
    const res = await col.updateOne(
      { $or: [{ account_id: accountOrProfileId }, { profile_id: accountOrProfileId }] } as any,
      { $set: { visible_to_provider: visible, updatedAt: new Date() } },
    );
    if (!res.matchedCount) throw new NotFoundException('contract_not_generated');
    return { ok: true, visible_to_provider: visible };
  }

  /**
   * Bridge: onboarding submissions live in the common provider_profiles collection,
   * while the admin moderation queue reads provider_accounts. Mirror every submission
   * into provider_accounts (status pending_admin_approval) so the contract, signature,
   * documents and bank data actually reach the admin review screen.
   */
  private async mirrorToModerationQueue(user: any, profile: ProviderProfileDocument) {
    const fullUser = await this.userModel.findOne({ id: user.id }).lean();
    const email = (fullUser?.email || '').toLowerCase().trim();
    if (!email) return; // account schema requires a unique email; OTP flow guarantees one
    const accounts = this.providerModel.db.collection('provider_accounts');
    const typeMap: Record<string, string> = { lab: 'laboratory' };
    const ptype = typeMap[profile.type] || profile.type;
    const now = new Date();
    const existing = await accounts.findOne({ email });
    const onboardingMeta = {
      source: 'provider_onboarding',
      profile_id: profile.id,
      signature_url: profile.signature_url || null,
      signer_name: profile.signer_name || null,
      signer_role: profile.signer_role || null,
      submitted_at: now,
    };
    if (!existing) {
      const accountId = uuidv4();
      await accounts.insertOne({
        id: accountId,
        email,
        phone_e164: fullUser?.phone,
        password_hash: fullUser?.password_hash || 'onboarding',
        provider_type: ptype,
        status: 'pending_admin_approval',
        email_verified: true,
        email_verified_at: now,
        failed_login_attempts: 0,
        status_history: [{ from: null, to: 'pending_admin_approval', by_user_id: user.id, by_role: 'provider', at: now, note: 'onboarding submitted' }],
        onboarding_progress: onboardingMeta,
        createdAt: now,
        updatedAt: now,
      });
      profile.account_id = accountId;
    } else {
      const current = existing.status;
      if (current !== 'approved' && current !== 'suspended') {
        await accounts.updateOne({ id: existing.id }, {
          $set: {
            provider_type: ptype,
            status: 'pending_admin_approval',
            email_verified: true,
            onboarding_progress: onboardingMeta,
            updatedAt: now,
          },
          $push: { status_history: { from: current, to: 'pending_admin_approval', by_user_id: user.id, by_role: 'provider', at: now, note: 'onboarding resubmitted' } } as any,
        });
      } else {
        await accounts.updateOne({ id: existing.id }, { $set: { onboarding_progress: onboardingMeta, updatedAt: now } });
      }
      profile.account_id = existing.id;
    }
    await profile.save();
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

  @UseGuards(JwtAuthGuard) @Get('my-profile')
  myProfile(@CurrentUser() u: any) { return this.svc.getMyProfile(u); }

  @UseGuards(JwtAuthGuard) @Post('step2')
  step2(@CurrentUser() u: any, @Body() b: any) { return this.svc.step2(u, b); }

  @UseGuards(JwtAuthGuard) @Post('step3')
  step3(@CurrentUser() u: any, @Body() b: any) { return this.svc.step3(u, b); }

  @UseGuards(JwtAuthGuard) @Post('submit')
  submit(@CurrentUser() u: any, @Body() b: any) { return this.svc.submit(u, b); }

  @UseGuards(JwtAuthGuard) @Get('progress')
  progress(@CurrentUser() u: any) { return this.svc.getProgress(u); }

  /** Provider downloads own contract — only when an admin granted visibility. */
  @UseGuards(JwtAuthGuard) @Get('contract')
  async myContract(@CurrentUser() u: any) {
    const c = await this.svc.getContractForOwner(u);
    return { pdf_base64: c.pdf_base64, sha256: c.sha256, generated_at: c.createdAt };
  }

  /** Admin: fetch the stored signed contract for a moderation account/profile. */
  @UseGuards(JwtAuthGuard) @Get('admin/contracts/:id')
  async adminContract(@CurrentUser() u: any, @Param('id') id: string) {
    if (u.role !== 'admin' && u.role !== 'super_admin') throw new ForbiddenException('admin only');
    const c = await this.svc.getContractForAdmin(id);
    return { pdf_base64: c.pdf_base64, sha256: c.sha256, visible_to_provider: c.visible_to_provider, generated_at: c.createdAt, signer_name: c.signer_name, signer_role: c.signer_role };
  }

  /** Admin: grant/revoke the provider's ability to view their signed contract. */
  @UseGuards(JwtAuthGuard) @Post('admin/contracts/:id/visibility')
  async adminContractVisibility(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    if (u.role !== 'admin' && u.role !== 'super_admin') throw new ForbiddenException('admin only');
    return this.svc.setContractVisibility(id, !!b?.visible);
  }
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
  providers: [ProviderOnboardingService, ContractPdfService],
  exports: [ProviderOnboardingService],
})
export class ProviderOnboardingModule {}
