import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { ProviderBranch, ProviderBranchDocument } from '../../schemas/provider-branch.schema';
import { ProviderDelta, ProviderDeltaSchema, DeltaStatus } from './schemas/provider-delta.schema';
import { ProviderType, ProviderStatus, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { UserRepository } from "./repositories/user.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { InjectModel } from '@nestjs/mongoose';

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
    @InjectModel(ProviderDelta.name) private deltaModel: Model<any>,
    private events: EventEmitter2,
  ) {}

  async createBranchStaffAccount(adminId: string, branchId: string, staffDto: any) {
    const admin = await this.userModel.findOne({ id: adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (![UserRole.HOSPITAL_ADMIN, UserRole.BRANCH_ADMIN].includes(admin.role)) {
      throw new ForbiddenException('صلاحية مرفوضة. فقط إدارة المستشفى تملك حق تعيين الموظفين الفرعيين.');
    }

    const branch = await this.branchModel.findById(branchId);
    if (!branch) throw new NotFoundException('الفرع المحدد غير موجود بالمنظومة.');

    // Create Sub-Account User
    const hash = await bcrypt.hash(staffDto.password || 'Temp123!', 8);
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
    const hash = await bcrypt.hash(data.password, 8);
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
    const hash = await bcrypt.hash(password, 8);
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
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: true } });
    this.events.emit('provider.approved', { provider_id: p.id });
    return p.toObject();
  }

  async reject(id: string, admin: any, reason: string) {
    const p = await this.providerModel.findOne({ id });
    if (!p) throw new NotFoundException();
    p.status = ProviderStatus.REJECTED;
    p.rejected_reason = reason;
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
    this.events.emit('provider.rejected', { provider_id: p.id, reason });
    return p.toObject();
  }

  async suspend(id: string, admin: any, reason: string) {
    const p = await this.providerModel.findOne({ id });
    if (!p) throw new NotFoundException();
    p.status = ProviderStatus.SUSPENDED;
    p.rejected_reason = reason;
    await p.save();
    await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
    this.events.emit('provider.suspended', { provider_id: p.id });
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
  async listPublic(
    type?: ProviderType,
    city?: string,
    insurance_company?: string,
    insurance_network?: string,
    insurance_class?: string,
  ) {
    const q: any = { status: ProviderStatus.ACTIVE };
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
  async getById(id: string) {
    const p = await this.providerModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!p) throw new NotFoundException();
    return p;
  }
  async myProfile(user_id: string) {
    return this.providerModel.findOne({ user_id }, { _id: 0, __v: 0 });
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
    }[type];
  }
  private publicUser(u: any) {
    const o = u.toObject ? u.toObject() : u;
    delete o.password_hash; delete o._id; delete o.__v;
    return o;
  }

  async updateProviderConfig(providerId: string, payload: any) {
    return (this.providerModel as any).findByIdAndUpdate(providerId, payload, { new: true });
  }

  async requestDeltaUpdate(providerId: string, oldData: any, newData: any) {
    return this.deltaModel.create({
      providerId,
      oldData,
      newData,
      status: DeltaStatus.PENDING,
    });
  }

  async listPendingDeltas() {
    return this.deltaModel.find({ status: DeltaStatus.PENDING });
  }

  async approveDelta(deltaId: string, adminId: string) {
    return this.deltaModel.findByIdAndUpdate(deltaId, { status: DeltaStatus.APPROVED, reviewedBy: adminId }, { new: true });
  }

  async rejectDelta(deltaId: string, adminId: string, reason: string) {
    return this.deltaModel.findByIdAndUpdate(deltaId, { status: DeltaStatus.REJECTED, reviewedBy: adminId, rejectionReason: reason }, { new: true });
  }
}
