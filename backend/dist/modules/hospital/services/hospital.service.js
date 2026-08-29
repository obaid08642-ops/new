"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const hospital_branch_schema_1 = require("../schemas/hospital-branch.schema");
const hospital_department_schema_1 = require("../schemas/hospital-department.schema");
const hospital_staff_schema_1 = require("../schemas/hospital-staff.schema");
const hospital_invitation_schema_1 = require("../schemas/hospital-invitation.schema");
const doctor_profile_extended_schema_1 = require("../../care/schemas/doctor-profile-extended.schema");
const user_schema_1 = require("../../../schemas/user.schema");
const common_2 = require("@nestjs/common");
const appointment_schema_1 = require("../../../schemas/appointment.schema");
const auth_guard_1 = require("../../../common/auth.guard");
const INVITATION_PERMISSION_KEYS = [
    'pricing', 'schedule', 'insurance', 'vacation', 'availability',
    'online_consultation', 'home_visit', 'catalog', 'read_stats', 'manage_wallet',
];
let HospitalService = class HospitalService {
    constructor(branchModel, departmentModel, staffModel, invitationModel, doctorModel, userModel, appointmentModel) {
        this.branchModel = branchModel;
        this.departmentModel = departmentModel;
        this.staffModel = staffModel;
        this.invitationModel = invitationModel;
        this.doctorModel = doctorModel;
        this.userModel = userModel;
        this.appointmentModel = appointmentModel;
    }
    assertFacilityActor(actor, write = false) {
        if (!actor)
            return;
        const roles = (0, auth_guard_1.getEffectiveRoles)(actor);
        const allowed = ['hospital', 'hospital_admin', 'branch_admin', 'receptionist', 'finance', 'admin', 'super_admin'];
        if (!roles.some(role => allowed.includes(role)))
            throw new common_2.ForbiddenException('hospital facility role required');
        const writeAllowed = ['hospital', 'hospital_admin', 'branch_admin', 'admin', 'super_admin'];
        if (write && !roles.some(role => writeAllowed.includes(role)))
            throw new common_2.ForbiddenException('facility write permission required');
    }
    async objectIdForUser(userId) {
        if (mongoose_2.Types.ObjectId.isValid(userId))
            return new mongoose_2.Types.ObjectId(userId);
        const user = await this.userModel.findOne({ id: userId }).select({ _id: 1 }).lean();
        if (!user?._id)
            throw new common_1.NotFoundException('hospital_user_not_found');
        return user._id;
    }
    objectId(value, field) {
        if (!value || !mongoose_2.Types.ObjectId.isValid(value))
            throw new common_1.BadRequestException(`${field}_must_be_object_id`);
        return new mongoose_2.Types.ObjectId(value);
    }
    async createInvitation(facilityId, body) {
        const identifier = (body?.identifier || '').trim();
        if (!identifier)
            throw new common_1.BadRequestException('identifier_required');
        const invitee = await this.userModel.findOne({
            $or: [{ phone: identifier }, { email: identifier.toLowerCase() }, { id: identifier }],
        }).lean();
        if (!invitee)
            throw new common_1.NotFoundException('provider_not_found');
        if (invitee.id === facilityId)
            throw new common_1.BadRequestException('cannot_invite_self');
        const permissions = Object.fromEntries(Object.entries(body?.permissions || {})
            .filter(([k]) => INVITATION_PERMISSION_KEYS.includes(k))
            .map(([k, v]) => [k, !!v]));
        const existing = await this.invitationModel.findOne({ facility_id: facilityId, invitee_id: invitee.id, status: 'pending' });
        if (existing)
            return existing;
        return this.invitationModel.create({
            facility_id: facilityId,
            invitee_id: invitee.id,
            invitee_identifier: identifier,
            role: body?.role || 'doctor',
            permissions,
        });
    }
    async listFacilityInvitations(facilityId) {
        const inv = await this.invitationModel.find({ facility_id: facilityId }).sort({ createdAt: -1 }).lean();
        const users = await this.userModel.find({ id: { $in: inv.map(i => i.invitee_id) } }).lean();
        const byId = new Map(users.map(u => [u.id, u]));
        return inv.map(i => ({ ...i, invitee_name: byId.get(i.invitee_id)?.full_name || null }));
    }
    async listMyInvitations(userId) {
        const inv = await this.invitationModel.find({ invitee_id: userId }).sort({ createdAt: -1 }).lean();
        const facilities = await this.userModel.find({ id: { $in: inv.map(i => i.facility_id) } }).lean();
        const byId = new Map(facilities.map(u => [u.id, u]));
        return inv.map(i => ({ ...i, facility_name: byId.get(i.facility_id)?.full_name || null }));
    }
    async respondInvitation(userId, invitationId, accept) {
        const inv = await this.invitationModel.findOne({ id: invitationId });
        if (!inv || inv.invitee_id !== userId)
            throw new common_1.NotFoundException('invitation_not_found');
        if (inv.status !== 'pending')
            throw new common_1.BadRequestException('invitation_already_responded');
        inv.status = accept ? 'accepted' : 'rejected';
        inv.responded_at = new Date();
        await inv.save();
        if (accept) {
            await this.userModel.updateOne({ id: userId }, { $set: { parent_provider_account_id: inv.facility_id, permissions: Object.keys(inv.permissions || {}).filter(k => inv.permissions[k]) } });
        }
        return inv;
    }
    async leaveFacility(userId) {
        const user = await this.userModel.findOne({ id: userId });
        if (!user)
            throw new common_1.NotFoundException('user_not_found');
        if (!user.parent_provider_account_id)
            throw new common_1.BadRequestException('not_linked_to_facility');
        user.parent_provider_account_id = undefined;
        user.permissions = [];
        await user.save();
        return { ok: true };
    }
    async createBranch(hospitalId, data, actor) {
        this.assertFacilityActor(actor, true);
        return this.branchModel.create({ ...data, hospital_id: await this.objectIdForUser(hospitalId) });
    }
    async getBranches(hospitalId, actor) {
        this.assertFacilityActor(actor);
        return this.branchModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
    }
    async createDepartment(hospitalId, data, actor) {
        this.assertFacilityActor(actor, true);
        return this.departmentModel.create({ ...data, hospital_id: await this.objectIdForUser(hospitalId) });
    }
    async getDepartments(hospitalId, actor) {
        this.assertFacilityActor(actor);
        return this.departmentModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
    }
    async addStaff(hospitalId, data, actor) {
        this.assertFacilityActor(actor, true);
        const hospitalObjectId = await this.objectIdForUser(hospitalId);
        const userObjectId = data.user_id ? await this.objectIdForUser(String(data.user_id)) : null;
        if (!userObjectId)
            throw new common_1.BadRequestException('user_id_required');
        const staff = { ...data, user_id: userObjectId, hospital_id: hospitalObjectId };
        if (data.branch_id)
            staff.branch_id = this.objectId(String(data.branch_id), 'branch_id');
        if (data.department_id)
            staff.department_id = this.objectId(String(data.department_id), 'department_id');
        return this.staffModel.create(staff);
    }
    async getStaff(hospitalId, actor) {
        this.assertFacilityActor(actor);
        return this.staffModel.find({ hospital_id: await this.objectIdForUser(hospitalId) });
    }
    async onboardDoctor(hospitalId, doctorId, actor) {
        this.assertFacilityActor(actor, true);
        const hospitalObjectId = await this.objectIdForUser(hospitalId);
        const doctorObjId = await this.objectIdForUser(doctorId);
        const doctorProfile = await this.doctorModel.findOneAndUpdate({ doctor_id: doctorObjId }, { $set: { affiliated_hospital_id: hospitalObjectId } }, { new: true, upsert: true });
        await this.userModel.findByIdAndUpdate(doctorObjId, { $set: { verified: true, active: true } });
        return doctorProfile;
    }
    async getUnifiedAppointments(hospitalId, branchId, actor) {
        this.assertFacilityActor(actor);
        const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
        const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId });
        const doctorIds = doctors.map(d => d.doctor_id.toString());
        const query = { doctor_id: { $in: doctorIds } };
        if (branchId)
            query.branch_id = branchId;
        return this.appointmentModel.find(query).sort({ slot_start: 1 }).limit(100);
    }
    async updateAppointmentStatus(hospitalId, appointmentId, status, actor) {
        this.assertFacilityActor(actor, true);
        if (!['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(String(status))) {
            throw new common_1.BadRequestException('invalid_appointment_status');
        }
        const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
        const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId }).select({ doctor_id: 1 }).lean();
        const doctorIds = doctors.map((d) => d.doctor_id);
        const appointment = await this.appointmentModel.findOneAndUpdate({ id: appointmentId, doctor_id: { $in: doctorIds } }, { $set: { status } }, { new: true });
        if (!appointment)
            throw new common_1.NotFoundException('appointment_not_found');
        return appointment;
    }
    async getAggregatedWallet(hospitalId, userRole, actor) {
        this.assertFacilityActor(actor);
        if (userRole === 'receptionist')
            throw new common_1.UnauthorizedException('Access Denied: Financial data restricted.');
        const affiliatedHospitalId = await this.objectIdForUser(hospitalId);
        const doctors = await this.doctorModel.find({ affiliated_hospital_id: affiliatedHospitalId });
        const doctorIds = doctors.map(d => d.doctor_id.toString());
        const completed = await this.appointmentModel.find({ doctor_id: { $in: doctorIds }, status: 'COMPLETED' });
        const totalRevenue = completed.reduce((sum, app) => sum + (app.total_price || 0), 0);
        return { success: true, total_revenue: totalRevenue, transactions_count: completed.length };
    }
};
exports.HospitalService = HospitalService;
exports.HospitalService = HospitalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(hospital_branch_schema_1.HospitalBranch.name)),
    __param(1, (0, mongoose_1.InjectModel)(hospital_department_schema_1.HospitalDepartment.name)),
    __param(2, (0, mongoose_1.InjectModel)(hospital_staff_schema_1.HospitalStaff.name)),
    __param(3, (0, mongoose_1.InjectModel)(hospital_invitation_schema_1.HospitalInvitation.name)),
    __param(4, (0, mongoose_1.InjectModel)(doctor_profile_extended_schema_1.DoctorProfileExtended.name)),
    __param(5, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(6, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], HospitalService);
//# sourceMappingURL=hospital.service.js.map