import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  /**
   * Hospital APIs are used by the hospital owner and by invited staff such as
   * receptionists. Staff tokens carry a UUID for the staff account, not the
   * Mongo _id nor necessarily the hospital account ID. Resolve the persisted
   * parent facility first so every read uses one canonical facility ObjectId.
   */
  private async facilityObjectId(hospitalId: string, actor?: any): Promise<Types.ObjectId> {
    const actorId = String(actor?.id || hospitalId || '');
    const actorRecord: any = actorId
      ? await this.userModel.findOne({ id: actorId }).select({ _id: 1, parent_provider_account_id: 1 }).lean()
      : null;
    const parentId = actor?.parent_provider_account_id || actorRecord?.parent_provider_account_id;
    return this.objectIdForUser(String(parentId || hospitalId));
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

  async createBranch(hospitalId: string, data: Partial<HospitalBranch>, actor?: any) {
    this.assertFacilityActor(actor, true);
    return this.branchModel.create({ ...data, hospital_id: await this.facilityObjectId(hospitalId, actor) });
  }

  async getBranches(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.branchModel.find({ hospital_id: await this.facilityObjectId(hospitalId, actor) });
  }

  async createDepartment(hospitalId: string, data: Partial<HospitalDepartment>, actor?: any) {
    this.assertFacilityActor(actor, true);
    return this.departmentModel.create({ ...data, hospital_id: await this.facilityObjectId(hospitalId, actor) });
  }

  async getDepartments(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.departmentModel.find({ hospital_id: await this.facilityObjectId(hospitalId, actor) });
  }

  async addStaff(hospitalId: string, data: Partial<HospitalStaff>, actor?: any) {
    this.assertFacilityActor(actor, true);
    const hospitalObjectId = await this.facilityObjectId(hospitalId, actor);
    const userObjectId = data.user_id ? await this.objectIdForUser(String(data.user_id)) : null;
    if (!userObjectId) throw new BadRequestException('user_id_required');
    const staff: any = { ...data, user_id: userObjectId, hospital_id: hospitalObjectId };
    if (data.branch_id) staff.branch_id = this.objectId(String(data.branch_id), 'branch_id');
    if (data.department_id) staff.department_id = this.objectId(String(data.department_id), 'department_id');
    return this.staffModel.create(staff);
  }

  async getStaff(hospitalId: string, actor?: any) {
    this.assertFacilityActor(actor);
    return this.staffModel.find({ hospital_id: await this.facilityObjectId(hospitalId, actor) });
  }

  async onboardDoctor(hospitalId: string, doctorId: string, actor?: any) {
    this.assertFacilityActor(actor, true);
    const hospitalObjectId = await this.facilityObjectId(hospitalId, actor);
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
    const affiliatedHospitalId = await this.facilityObjectId(hospitalId, actor);
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
    const affiliatedHospitalId = await this.facilityObjectId(hospitalId, actor);
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
    const affiliatedHospitalId = await this.facilityObjectId(hospitalId, actor);
    const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId });
    const doctorIds = doctors.map(d => d.doctor_id.toString());
    const completed = await this.appointmentModel.find({ doctor_id: { $in: doctorIds }, status: 'COMPLETED' });
    const totalRevenue = completed.reduce((sum, app: any) => sum + (app.total_price || 0), 0);
    return { success: true, total_revenue: totalRevenue, transactions_count: completed.length };
  }
}

