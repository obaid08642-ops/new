import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { HospitalBranch } from '../schemas/hospital-branch.schema';
import { HospitalDepartment } from '../schemas/hospital-department.schema';
import { HospitalStaff } from '../schemas/hospital-staff.schema';
import { HospitalInvitation } from '../schemas/hospital-invitation.schema';
import { DoctorProfileExtended } from '../../care/schemas/doctor-profile-extended.schema';
import { User } from '../../../schemas/user.schema';
import { ForbiddenException } from '@nestjs/common';
import { Appointment } from '../../../schemas/appointment.schema';
import { getEffectiveRoles } from '../../../common/auth.guard';

// Whitelist of permission keys a facility may grant through an invitation —
// anything else in the payload is silently dropped (mass-assignment guard).
const INVITATION_PERMISSION_KEYS = [
  'pricing', 'schedule', 'insurance', 'vacation', 'availability',
  'online_consultation', 'home_visit', 'catalog', 'read_stats', 'manage_wallet',
];

@Injectable()
export class HospitalService {
  constructor(
    @InjectModel(HospitalBranch.name) private branchModel: Model<HospitalBranch>,
    @InjectModel(HospitalDepartment.name) private departmentModel: Model<HospitalDepartment>,
    @InjectModel(HospitalStaff.name) private staffModel: Model<HospitalStaff>,
    @InjectModel(HospitalInvitation.name) private invitationModel: Model<HospitalInvitation>,
    @InjectModel(DoctorProfileExtended.name) private doctorModel: Model<DoctorProfileExtended>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) {}

  private assertFacilityActor(actor?: any, write = false): void {
    if (!actor) return;
    const roles = getEffectiveRoles(actor);
    const allowed = ['hospital', 'hospital_admin', 'branch_admin', 'receptionist', 'finance', 'admin', 'super_admin'];
    if (!roles.some(role => allowed.includes(role))) throw new ForbiddenException('hospital facility role required');
    const writeAllowed = ['hospital', 'hospital_admin', 'branch_admin', 'admin', 'super_admin'];
    if (write && !roles.some(role => writeAllowed.includes(role))) throw new ForbiddenException('facility write permission required');
  }

  private async objectIdForUser(userId: string): Promise<Types.ObjectId> {
    if (Types.ObjectId.isValid(userId)) return new Types.ObjectId(userId);
    const user: any = await this.userModel.findOne({ id: userId }).select({ _id: 1 }).lean();
    if (!user?._id) throw new NotFoundException('hospital_user_not_found');
    return user._id;
  }

  private objectId(value: string, field: string): Types.ObjectId {
    if (!value || !Types.ObjectId.isValid(value)) throw new BadRequestException(`${field}_must_be_object_id`);
    return new Types.ObjectId(value);
  }

  // ── Facility → provider invitations (additive) ────────────────────────────

  async createInvitation(facilityId: string, body: { identifier?: string; role?: string; permissions?: Record<string, boolean> }) {
    const identifier = (body?.identifier || '').trim();
    if (!identifier) throw new BadRequestException('identifier_required');
    const invitee: any = await this.userModel.findOne({
      $or: [{ phone: identifier }, { email: identifier.toLowerCase() }, { id: identifier }],
    }).lean();
    if (!invitee) throw new NotFoundException('provider_not_found');
    if (invitee.id === facilityId) throw new BadRequestException('cannot_invite_self');
    const permissions = Object.fromEntries(
      Object.entries(body?.permissions || {})
        .filter(([k]) => INVITATION_PERMISSION_KEYS.includes(k))
        .map(([k, v]) => [k, !!v]),
    );
    // One pending invitation per facility+invitee — re-sending returns it.
    const existing = await this.invitationModel.findOne({ facility_id: facilityId, invitee_id: invitee.id, status: 'pending' });
    if (existing) return existing;
    return this.invitationModel.create({
      facility_id: facilityId,
      invitee_id: invitee.id,
      invitee_identifier: identifier,
      role: body?.role || 'doctor',
      permissions,
    });
  }

  async listFacilityInvitations(facilityId: string) {
    const inv = await this.invitationModel.find({ facility_id: facilityId }).sort({ createdAt: -1 }).lean();
    const users: any[] = await this.userModel.find({ id: { $in: inv.map(i => i.invitee_id) } }).lean();
    const byId = new Map(users.map(u => [u.id, u]));
    return inv.map(i => ({ ...i, invitee_name: byId.get(i.invitee_id)?.full_name || null }));
  }

  async listMyInvitations(userId: string) {
    const inv = await this.invitationModel.find({ invitee_id: userId }).sort({ createdAt: -1 }).lean();
    const facilities: any[] = await this.userModel.find({ id: { $in: inv.map(i => i.facility_id) } }).lean();
    const byId = new Map(facilities.map(u => [u.id, u]));
    return inv.map(i => ({ ...i, facility_name: byId.get(i.facility_id)?.full_name || null }));
  }

  async respondInvitation(userId: string, invitationId: string, accept: boolean) {
    const inv = await this.invitationModel.findOne({ id: invitationId });
    // Ownership check: only the invitee may respond (no IDOR).
    if (!inv || inv.invitee_id !== userId) throw new NotFoundException('invitation_not_found');
    if (inv.status !== 'pending') throw new BadRequestException('invitation_already_responded');
    inv.status = accept ? 'accepted' : 'rejected';
    inv.responded_at = new Date();
    await inv.save();
    if (accept) {
      // Link the provider under the facility with the granted permissions.
      await this.userModel.updateOne(
        { id: userId },
        { $set: { parent_provider_account_id: inv.facility_id, permissions: Object.keys(inv.permissions || {}).filter(k => inv.permissions[k]) } },
      );
    }
    return inv;
  }

  /** Provider leaves its linked facility: clears the link and facility-granted permissions. */
  async leaveFacility(userId: string) {
    const user: any = await this.userModel.findOne({ id: userId });
    if (!user) throw new NotFoundException('user_not_found');
    if (!user.parent_provider_account_id) throw new BadRequestException('not_linked_to_facility');
    user.parent_provider_account_id = undefined;
    user.permissions = [];
    await user.save();
    return { ok: true };
  }

  async createBranch(hospitalId: string, data: Partial<HospitalBranch>, actor?: any) {
    this.assertFacilityActor(actor, true);
    return this.branchModel.create({ ...data, hospital_id: await this.objectIdForUser(hospitalId) });
  }

  async getBranches(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.branchModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
  }

  async createDepartment(hospitalId: string, data: Partial<HospitalDepartment>, actor?: any) {
    this.assertFacilityActor(actor, true);
    return this.departmentModel.create({ ...data, hospital_id: await this.objectIdForUser(hospitalId) });
  }

  async getDepartments(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.departmentModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
  }

  async addStaff(hospitalId: string, data: Partial<HospitalStaff>, actor?: any) {
    this.assertFacilityActor(actor, true);
    const hospitalObjectId = await this.objectIdForUser(hospitalId);
    // Sub-account with login: create the central User, plus a full provider
    // account+profile for clinical roles (same dashboards as standalone).
    // Admin roles (reception/insurance) get a staff record without app login
    // because no dashboard exists for them yet.
    const CLINICAL: Record<string, { staff: string; ptype: string }> = {
      doctor: { staff: 'doctor', ptype: 'doctor' },
      nurse: { staff: 'nurse', ptype: 'nursing' },
      lab: { staff: 'lab_tech', ptype: 'laboratory' },
      pharmacist: { staff: 'pharmacist', ptype: 'pharmacy' },
      radiologist: { staff: 'radiologist', ptype: 'radiology' },
    };
    const ADMIN_STAFF: Record<string, string> = {
      reception: 'receptionist', insurance: 'insurance_coordinator',
    };
    let userObjectId = data.user_id ? await this.objectIdForUser(String(data.user_id)) : null;
    let accountId: string | null = null;
    let loginAvailable = !!userObjectId;
    if (!userObjectId) {
      const email = String((data as any).email || '').toLowerCase().trim();
      const password = String((data as any).password || '');
      const fullName = String((data as any).full_name || '').trim();
      if (!fullName) throw new BadRequestException('full_name required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('valid email required');
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new BadRequestException('password must be at least 8 characters with letters and numbers');
      const roleKey = String((data as any).staff_role || '');
      const clinical = CLINICAL[roleKey];
      const adminRole = ADMIN_STAFF[roleKey];
      if (!clinical && !adminRole) throw new BadRequestException('unknown staff_role');
      const db = this.staffModel.db;
      const dupUser = await this.userModel.findOne({ email }).select({ _id: 1 }).lean();
      if (dupUser) throw new ConflictException('email already registered');
      if (clinical && await db.collection('provider_accounts').findOne({ email })) throw new ConflictException('email already registered');
      const password_hash = await bcrypt.hash(password, 10);
      const createdUser = await this.userModel.create({
        full_name: fullName, email, password_hash,
        role: clinical ? clinical.ptype : adminRole, active: true,
      });
      userObjectId = createdUser._id;
      if (clinical) {
        const accId = randomUUID();
        await db.collection('provider_accounts').insertOne({
          id: accId, email, password_hash, provider_type: clinical.ptype,
          status: 'email_verified', email_verified: true,
          status_history: [{ from: '', to: 'email_verified', by_user_id: hospitalId, by_role: 'facility', at: new Date() }],
          createdAt: new Date(), updatedAt: new Date(),
        });
        await db.collection('provider_profiles').insertOne({
          account_id: accId, provider_type: clinical.ptype,
          display_name_ar: (data as any).name_ar || fullName,
          display_name_en: (data as any).name_en || fullName,
          legal_name: (data as any).legal_name || fullName,
          parent_facility_id: hospitalObjectId, staff_role: roleKey,
          specialty: (data as any).department, scfhs_number: (data as any).scfhs,
          createdAt: new Date(), updatedAt: new Date(),
        });
        accountId = accId;
        loginAvailable = true;
      }
    }
    const staff: any = {
      hospital_id: hospitalObjectId, user_id: userObjectId,
      role: (CLINICAL[String((data as any).staff_role || '')]?.staff) || (ADMIN_STAFF[String((data as any).staff_role || '')]) || 'receptionist',
      is_active: true,
    };
    if (data.branch_id) staff.branch_id = this.objectId(String(data.branch_id), 'branch_id');
    if (data.department_id) staff.department_id = this.objectId(String(data.department_id), 'department_id');
    const created = await this.staffModel.create(staff);
    return { staff: created, account_id: accountId, login_available: loginAvailable };
  }

  async getStaff(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.staffModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
  }

  async onboardDoctor(hospitalId: string, doctorId: string, actor?: any) {
    this.assertFacilityActor(actor, true);
    const hospitalObjectId = await this.objectIdForUser(hospitalId);
    const doctorObjId = await this.objectIdForUser(doctorId);
    const doctorProfile = await this.doctorModel.findOneAndUpdate(
      { doctor_id: doctorObjId },
      { $set: { affiliated_hospital_id: hospitalObjectId } },
      { new: true, upsert: true },
    );
    await this.userModel.findByIdAndUpdate(doctorObjId, { $set: { verified: true, active: true } });
    return doctorProfile;
  }

  async getUnifiedAppointments(hospitalId: string, branchId?: string, actor?: any) {
    this.assertFacilityActor(actor);
    const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId });
    const doctorIds = doctors.map(d => d.doctor_id.toString());
    const query: any = { doctor_id: { $in: doctorIds } };
    if (branchId) query.branch_id = branchId;
    return this.appointmentModel.find(query).sort({ slot_start: 1 }).limit(100);
  }

  async updateAppointmentStatus(hospitalId: string, appointmentId: string, status: string, actor?: any) {
    this.assertFacilityActor(actor, true);
    if (!['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(String(status))) {
      throw new BadRequestException('invalid_appointment_status');
    }
    const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId }).select({ doctor_id: 1 }).lean();
    const doctorIds = doctors.map((d: any) => d.doctor_id);
    const appointment = await this.appointmentModel.findOneAndUpdate(
      { id: appointmentId, doctor_id: { $in: doctorIds } },
      { $set: { status } },
      { new: true },
    );
    if (!appointment) throw new NotFoundException('appointment_not_found');
    return appointment;
  }

  async getAggregatedWallet(hospitalId: string, userRole: string, actor?: any) {
    this.assertFacilityActor(actor);
    if (userRole === 'receptionist') throw new UnauthorizedException('Access Denied: Financial data restricted.');
    const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId });
    const doctorIds = doctors.map(d => d.doctor_id.toString());
    const completed = await this.appointmentModel.find({ doctor_id: { $in: doctorIds }, status: 'COMPLETED' });
    const totalRevenue = completed.reduce((sum, app: any) => sum + (app.total_price || 0), 0);
    return { success: true, total_revenue: totalRevenue, transactions_count: completed.length };
  }
}

