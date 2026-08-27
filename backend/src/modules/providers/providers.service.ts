import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { ProviderBranch, ProviderBranchDocument } from '../../schemas/provider-branch.schema';
import { ProviderType, ProviderStatus, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { UserRepository } from "./repositories/user.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { InjectModel } from '@nestjs/mongoose';
import { CatalogPublicationService } from '../events/catalog-publication.service';

/**
 * Provider Onboarding Service
 * Supports BOTH:
 *  1. Self-registration (`/apply`) — provider creates their own user + profile (status=pending)
 *  2. Admin-assisted (`/admin/create`) — admin creates user + profile directly
 * All providers go through admin review queue before becoming public.
 */
@Injectable()
export class ProvidersService {
  constructor(
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @InjectModel(ProviderBranch.name) private branchModel: Model<ProviderBranchDocument>,
    private events: EventEmitter2,
    private readonly publication: CatalogPublicationService,
  ) {}

  private async refreshPublicProjection(provider: any, actorId: string, reason: string) {
    const reviewedAt = provider?.last_reviewed || provider?.approved_at || provider?.updatedAt || new Date();
    return this.publication.refresh({
      entityType: 'provider',
      entityId: provider.id,
      actorId,
      actorRole: 'admin',
      reason,
      idempotencyKey: `catalog-publication:provider:${provider.id}:${reason}:${new Date(reviewedAt).toISOString()}`,
    });
  }

  async createBranchStaffAccount(adminId: string, branchId: string, staffDto: any) {
    const admin = await this.userModel.findOne({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (![UserRole.HOSPITAL_ADMIN, UserRole.BRANCH_ADMIN].includes(admin.role)) {
      throw new ForbiddenException('صلاحية مرفوضة. فقط إدارة المستشفى تملك حق تعيين الموظفين الفرعيين.');
    }

    const branch = await this.branchModel.findById(branchId);
    if (!branch) throw new NotFoundException('الفرع المحدد غير موجود بالمنظومة.');

    // Create Sub-Account User
    const hash = await bcrypt.hash(staffDto.password || 'Temp123!', 12);
    const staffUser = await this.userModel.create({
      full_name: staffDto.fullName,
      email: staffDto.email,
      phone: staffDto.phone,
      password_hash: hash,
      role: staffDto.role, // DOCTOR or RECEPTIONIST
      parent_provider_account_id: admin.parent_provider_account_id,
      assigned_branch_id: branch._id,
      active: true
    });

    if (staffDto.role === UserRole.DOCTOR) {
      // INSTITUTIONAL AUTO-APPROVAL BYPASS RULE
      // Doctors created under a verified hospital umbrella bypass the Nabdah Admin verification queue entirely.
      await this.providerModel.create({
        user_id: staffUser.id,
        type: ProviderType.DOCTOR,
        status: ProviderStatus.ACTIVE, // Set active/verified directly
        license_verified: true,
        name_ar: staffDto.fullNameAr || staffDto.fullName,
        name_en: staffDto.fullNameEn || staffDto.fullName,
        specialty: staffDto.specialty,
        years_experience: staffDto.years_experience || 0,
        price_clinic: staffDto.priceClinic || 100,
        price_online: staffDto.priceOnline || 100,
        approved_at: new Date()
      });

      // Update Branch Doctors Roster array
      branch.doctors_roster.push(staffUser.id);
      await branch.save();
    }

    return { success: true, message: 'تم إنشاء الحساب الفرعي وتفعيله تلقائياً تحت مظلة ترخيص المستشفى.' };
  }

  // ============ Self Registration ============
  async apply(data: {
    full_name: string; phone: string; password: string; email?: string;
    type: ProviderType; name_ar: string; name_en?: string;
    license_number?: string; city?: string; district?: string;
    specialty?: string; years_experience?: number;
    consultation_modes?: string[]; price_clinic?: number; price_online?: number;
    pharmacy_chain?: string; has_own_drivers?: boolean;
  }) {
    const exists = await this.userModel.findOne({ phone: data.phone });
    if (exists) throw new ConflictException('Phone already registered');
    const hash = await bcrypt.hash(data.password, 12);
    const role = this.typeToRole(data.type);
    const user = await this.userModel.create({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      password_hash: hash,
      role,
      active: false, // disabled until admin approves
    });
    const profile = await this.providerModel.create({
      user_id: user.id,
      type: data.type,
      status: ProviderStatus.PENDING,
      name_ar: data.name_ar,
      name_en: data.name_en,
      license_number: data.license_number,
      city: data.city,
      district: data.district,
      specialty: data.specialty,
      years_experience: data.years_experience,
      consultation_modes: data.consultation_modes || [],
      price_clinic: data.price_clinic,
      price_online: data.price_online,
      pharmacy_chain: data.pharmacy_chain,
      has_own_drivers: !!data.has_own_drivers,
    });
    this.events.emit(EVENTS.USER_REGISTERED, { user_id: user.id, role });
    this.events.emit('provider.pending_review', { provider_id: profile.id, type: data.type });
    return { ok: true, user: this.publicUser(user), profile: profile.toObject() };
  }

  // ============ Admin-Assisted Creation ============
  async adminCreate(data: any, _admin: any) {
    // Admin can create with password OR auto-generate, status defaults to PENDING but admin
    // can flag `auto_approve=true` to skip review.
    const exists = await this.userModel.findOne({ phone: data.phone });
    if (exists) throw new ConflictException('Phone already registered');
    const password = data.password || `Temp@${Math.floor(Math.random() * 10000)}`;
    const hash = await bcrypt.hash(password, 12);
    const role = this.typeToRole(data.type);
    const status: ProviderStatus = data.auto_approve ? ProviderStatus.ACTIVE : ProviderStatus.PENDING;
    const user = await this.userModel.create({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      password_hash: hash,
      role,
      active: status === ProviderStatus.ACTIVE,
    });
    const profile = await this.providerModel.create({
      user_id: user.id,
      type: data.type,
      status,
      name_ar: data.name_ar,
      name_en: data.name_en,
      license_number: data.license_number,
      license_verified: !!data.auto_approve,
      city: data.city,
      district: data.district,
      location: data.location,
      specialty: data.specialty,
      years_experience: data.years_experience,
      consultation_modes: data.consultation_modes || [],
      price_clinic: data.price_clinic,
      price_online: data.price_online,
      price_home: data.price_home,
      pharmacy_chain: data.pharmacy_chain,
      has_own_drivers: !!data.has_own_drivers,
      working_hours: data.working_hours || [],
      approved_at: data.auto_approve ? new Date() : undefined,
    });
    this.events.emit(EVENTS.USER_REGISTERED, { user_id: user.id, role });
    if (status === ProviderStatus.PENDING) {
      this.events.emit('provider.pending_review', { provider_id: profile.id, type: data.type });
    } else {
      this.events.emit('provider.approved', { provider_id: profile.id });
    }
    return { ok: true, user: this.publicUser(user), profile: profile.toObject(), generated_password: data.password ? undefined : password };
  }

  // ============ Admin Review ============
  async approve(id: string, admin: any) {
    const p = await this.providerModel.findOne({ id });
    if (!p) throw new NotFoundException();
    p.status = ProviderStatus.ACTIVE;
    p.approved_at = new Date();
    p.approved_by = admin.id;
    p.license_verified = true;
    p.public_eligibility = true;
    p.indexing_eligibility = false;
    p.medical_review_status = 'approved';
    p.last_reviewed = p.approved_at;
    p.provenance = 'admin_provider_review';
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: true } });
    this.events.emit('provider.approved', { provider_id: p.id });
    await this.refreshPublicProjection(p, admin.id, 'provider_approved');
    return p.toObject();
  }

  async reject(id: string, admin: any, reason: string) {
    const p = await this.providerModel.findOne({ id });
    if (!p) throw new NotFoundException();
    p.status = ProviderStatus.REJECTED;
    p.rejected_reason = reason;
    p.public_eligibility = false;
    p.indexing_eligibility = false;
    p.medical_review_status = 'rejected';
    p.last_reviewed = new Date();
    p.provenance = 'admin_provider_review';
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
    this.events.emit('provider.rejected', { provider_id: p.id, reason });
    await this.refreshPublicProjection(p, admin.id, 'provider_rejected');
    return p.toObject();
  }

  async suspend(id: string, admin: any, reason: string) {
    const p = await this.providerModel.findOne({ id });
    if (!p) throw new NotFoundException();
    p.status = ProviderStatus.SUSPENDED;
    p.rejected_reason = reason;
    p.public_eligibility = false;
    p.indexing_eligibility = false;
    p.medical_review_status = 'suspended';
    p.last_reviewed = new Date();
    p.provenance = 'admin_provider_review';
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
    this.events.emit('provider.suspended', { provider_id: p.id });
    await this.refreshPublicProjection(p, admin.id, 'provider_suspended');
    return p.toObject();
  }

  // ============ Listing ============
  async listPending() {
    return this.providerModel.find({ status: ProviderStatus.PENDING }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
  }
  async listAll(type?: ProviderType, status?: ProviderStatus, search?: string) {
    const q: any = {};
    if (type) q.type = type;
    if (status) q.status = status;
    if (search) q.$or = [{ name_ar: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
    return this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(500);
  }
  private publicDiscoveryFilter() {
    return {
      status: ProviderStatus.ACTIVE,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
  }

  async listPublic(
    type?: ProviderType,
    city?: string,
    insurance_company?: string,
    insurance_network?: string,
    insurance_class?: string,
  ) {
    const q: any = this.publicDiscoveryFilter();
    if (type) q.type = type;
    if (city) q.city = city;

    if (insurance_company || insurance_network || insurance_class) {
      const elemMatch: any = {};
      if (insurance_company) {
        elemMatch.$or = [
          { company_id: insurance_company },
          { company_name_en: { $regex: new RegExp(insurance_company, 'i') } },
          { company_name_ar: { $regex: new RegExp(insurance_company, 'i') } }
        ];
      }
      if (insurance_network) {
        const netOr = [
          { network_id: insurance_network },
          { network_name_en: { $regex: new RegExp(insurance_network, 'i') } },
          { network_name_ar: { $regex: new RegExp(insurance_network, 'i') } }
        ];
        if (elemMatch.$or) {
          elemMatch.$and = [
            { $or: elemMatch.$or },
            { $or: netOr }
          ];
          delete elemMatch.$or;
        } else {
          elemMatch.$or = netOr;
        }
      }
      if (insurance_class) {
        const cleanClass = insurance_class.replace(/class\s+/i, '').toUpperCase();
        elemMatch.covered_classes = { 
          $in: [
            insurance_class, 
            cleanClass, 
            `Class ${cleanClass}`, 
            `class ${cleanClass}`,
            insurance_class.toUpperCase(),
            insurance_class.toLowerCase()
          ] 
        };
      }
      q.insurance_contracts = { $elemMatch: elemMatch };
    }

    return this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ rating: -1, createdAt: -1 }).limit(200);
  }
  /** Map providers: ACTIVE only, must have real stored coordinates. */
  async mapProviders(type?: string, lat?: number, lng?: number, radiusKm?: number) {
    const q: any = { ...this.publicDiscoveryFilter(), 'location.lat': { $exists: true, $ne: null }, 'location.lng': { $exists: true, $ne: null } };
    if (type) q.type = type;
    const rows = await this.providerModel.find(q, { _id: 0, __v: 0, password_hash: 0 }).limit(300);
    const hav = (la1: number, ln1: number, la2: number, ln2: number) => {
      const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLn = (ln2 - ln1) * Math.PI / 180;
      const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLn / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    let out = rows.map((r: any) => {
      const o = r.toObject ? r.toObject() : r;
      const loc = o.location || {};
      const item: any = {
        id: o.id || o.user_id, type: o.type, name_ar: o.name_ar, name_en: o.name_en,
        city: o.city, district: o.district, rating: o.rating ?? null,
        lat: loc.lat, lng: loc.lng,
        distance_km: (lat != null && lng != null && isFinite(lat) && isFinite(lng))
          ? Math.round(hav(lat, lng, loc.lat, loc.lng) * 10) / 10 : null,
      };
      return item;
    });
    if (radiusKm && lat != null && lng != null) out = out.filter((x: any) => x.distance_km != null && x.distance_km <= radiusKm);
    if (lat != null && lng != null) out.sort((a: any, b: any) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9));
    return out;
  }

  async getById(id: string) {
    const p = await this.providerModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!p) throw new NotFoundException();
    return p;
  }

  async getPublicById(id: string) {
    const p = await this.providerModel.findOne({ id, ...this.publicDiscoveryFilter() }, { _id: 0, __v: 0 });
    if (!p) throw new NotFoundException();
    return p;
  }
  async myProfile(actor: any) {
    const identifiers = [
      actor?.id,
      actor?.account_id,
      actor?.provider_id,
      actor?.provider_profile_id,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (identifiers.length === 0) throw new NotFoundException();
    const profile = await this.providerModel.findOne(
      { $or: [{ user_id: { $in: identifiers } }, { id: { $in: identifiers } }, { account_id: { $in: identifiers } }] },
      { _id: 0, __v: 0 },
    );
    if (!profile) throw new NotFoundException();
    return profile;
  }

  // ============ Helpers ============
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
  private publicUser(u: any) {
    const o = u.toObject ? u.toObject() : u;
    delete o.password_hash; delete o._id; delete o.__v;
    return o;
  }

  /** Idempotent demo-data seeder for lab/radiology/home_care/hospital. Skips existing. */
  async seedDemoProviders() {
    const inserted: any[] = [];
    const skipped: any[] = [];
    const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'];
    const insurances = ['Bupa', 'Tawuniya', 'MedGulf', 'AlRajhi', 'SAICO'];
    const sets: any = {
      lab: [['مختبر الرياض الطبي', 'Riyadh Medical Lab'], ['مختبر الفيصل', 'Al Faisal Lab'], ['البرج الذهبي', 'Golden Tower Lab'], ['الياسمين الطبي', 'Yasmin Medical Lab'], ['الرعاية المتقدمة', 'Advanced Care Lab']],
      radiology: [['مركز الأشعة المتقدم', 'Advanced Imaging'], ['الرياض للأشعة', 'Riyadh Imaging Center'], ['شعاع الطبي', 'Shoaa Medical Imaging'], ['الفجر للأشعة', 'Al Fajr Imaging'], ['الصفوة الطبية', 'Al Safwa Medical']],
      home_care: [['تمريض المنزل', 'Home Nursing SA'], ['الرعاية المنزلية', 'Care At Home'], ['تمريض راحة', 'Comfort Nursing']],
      hospital: [['مستشفى الأمل', 'Al Amal Hospital'], ['الحياة الطبي', 'Al Hayat Medical'], ['الشفاء الجامعي', 'Shifaa University']],
    };
    for (const type of Object.keys(sets)) {
      for (let i = 0; i < sets[type].length; i++) {
        const [name_ar, name_en] = sets[type][i];
        const exists = await this.providerModel.findOne({ name_ar, type });
        if (exists) { skipped.push({ type, name_ar }); continue; }
        const doc = await this.providerModel.create({
          user_id: `system-seed-${type}-${i}`,
          type: type as any,
          status: ProviderStatus.ACTIVE,
          name_ar, name_en,
          license_number: `LIC-${type.toUpperCase()}-${1000 + i}`,
          license_verified: true,
          city: cities[i % cities.length], district: `حي ${cities[i % cities.length]}`,
          location: { lat: 24.7 + Math.random() * 0.5, lng: 46.6 + Math.random() * 0.5 },
          rating: 4.2 + Math.random() * 0.7,
          reviews_count: 30 + Math.floor(Math.random() * 250),
          coverage_radius_km: 15,
          home_visit_supported: i % 2 === 0,
          home_visit_radius_km: 20,
          accepts_cash: true,
          accepts_insurance: true,
          accepted_insurance: insurances.slice(0, 2 + (i % 3)),
          test_categories: type === 'lab' ? ['hematology', 'chemistry', 'immunology', 'microbiology'] : type === 'radiology' ? ['xray', 'ultrasound', 'mri', 'ct'] : [],
          equipment_list: type === 'radiology' ? ['MRI 1.5T', 'CT Scan', 'Ultrasound', 'X-Ray'] : [],
          working_hours: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'].map((day) => ({ day, open: '08:00', close: '22:00', closed: false })).concat([{ day: 'friday', open: '14:00', close: '22:00', closed: false }]),
          onboarding_completed: true,
          approved_at: new Date(),
          approved_by: 'system-seed',
        });
        inserted.push({ id: doc.id, type, name_ar });
      }
    }
  }

  async updateProviderConfig(providerId: string, payload: any) {
    const provider: any = await this.providerModel.findOne({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    // This is intentionally an allow-list: configuration updates must never
    // mutate identity, status, verification, or public-governance fields.
    const editable = new Set([
      'name_ar', 'name_en', 'phone', 'email', 'avatar', 'specialty', 'city',
      'district', 'location', 'about_ar', 'about_en', 'working_hours',
      'home_visit_supported', 'home_visit_radius_km', 'coverage_radius_km',
      'accepts_cash', 'accepts_insurance', 'accepted_insurance',
      'consultation_fee', 'languages', 'services',
    ]);
    const patch = Object.fromEntries(Object.entries(payload || {}).filter(([key, value]) => editable.has(key) && value !== undefined));
    if (!Object.keys(patch).length) throw new BadRequestException('No editable provider configuration fields supplied');

    const requiresReapproval = provider.public_eligibility === true
      || provider.indexing_eligibility === true
      || provider.medical_review_status === 'approved';
    const governanceReset = requiresReapproval ? {
      public_eligibility: false,
      indexing_eligibility: false,
      medical_review_status: 'pending',
      last_reviewed: null,
      provenance: 'provider_config_edit_pending_review',
    } : {};
    const updated: any = await (this.providerModel as any).findOneAndUpdate(
      { id: providerId },
      { $set: { ...patch, ...governanceReset, updatedAt: new Date() } },
      { new: true },
    );
    if (requiresReapproval) {
      await this.refreshPublicProjection(updated || { ...provider, ...patch, ...governanceReset }, provider.user_id || provider.id, 'provider_config_edit_reapproval');
    }
    return updated;
  }

}
