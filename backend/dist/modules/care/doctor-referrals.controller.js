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
exports.DoctorReferralsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const encounter_referrals_schema_1 = require("./schemas/encounter-referrals.schema");
const doctor_profile_extended_schema_1 = require("./schemas/doctor-profile-extended.schema");
let DoctorReferralsController = class DoctorReferralsController {
    constructor(referralModel, doctorProfileModel, conn) {
        this.referralModel = referralModel;
        this.doctorProfileModel = doctorProfileModel;
        this.conn = conn;
    }
    async assertDoctorOwnership(req, doctorId) {
        const role = req.user?.role;
        if (role === 'admin' || role === 'super_admin')
            return;
        if (req.user?.id && String(req.user.id) === String(doctorId))
            return;
        const me = await this.conn.db.collection('users').findOne({ id: req.user?.id }, { projection: { _id: 1 } });
        if (me && String(me._id) === String(doctorId))
            return;
        throw new common_1.ForbiddenException('Cannot access another doctor\'s referrals');
    }
    async myReferrals(req, doctorId) {
        if (!mongoose_3.Types.ObjectId.isValid(doctorId))
            throw new common_1.BadRequestException('invalid doctor id');
        await this.assertDoctorOwnership(req, doctorId);
        const rows = await this.referralModel
            .find({ doctor_id: new mongoose_3.Types.ObjectId(doctorId) })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const patientIds = [...new Set(rows.map((r) => String(r.patient_id)))]
            .filter((id) => mongoose_3.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_3.Types.ObjectId(id));
        const users = patientIds.length
            ? await this.conn.db.collection('users')
                .find({ _id: { $in: patientIds } }, { projection: { full_name: 1, name: 1, phone: 1 } })
                .toArray()
            : [];
        const nameMap = new Map(users.map((u) => [String(u._id), u.full_name || u.name || u.phone || '']));
        return rows.map((r) => ({
            id: String(r._id),
            type: r.requested_radiology_scans?.length && r.requested_lab_tests?.length
                ? 'BOTH'
                : r.requested_radiology_scans?.length
                    ? 'RADIOLOGY'
                    : r.requested_lab_tests?.length
                        ? 'LAB'
                        : 'HOME_CARE',
            patientName: nameMap.get(String(r.patient_id)) || '',
            labTests: r.requested_lab_tests || [],
            radScans: r.requested_radiology_scans || [],
            homeCareNotes: r.home_care_recommendation_notes || null,
            status: r.diagnostic_results_returned ? 'COMPLETED' : 'PENDING',
            date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
            fileUrls: r.returned_results_file_urls || [],
        }));
    }
    async issueReferralsAndPrescription(req, payload) {
        const { appointmentId, patientId, doctorId, labTests, radScans, homeCareNotes, medications } = payload;
        await this.assertDoctorOwnership(req, doctorId);
        const doctorProfile = await this.doctorProfileModel.findOne({ doctor_id: new mongoose_3.Types.ObjectId(doctorId) });
        const isInstitutional = doctorProfile && doctorProfile.parent_provider_account_id;
        const prescriptionStatus = isInstitutional ? 'hospital_internal_dispatch' : 'public_radius_broadcast';
        const referral = await this.referralModel.create({
            appointment_id: new mongoose_3.Types.ObjectId(appointmentId),
            patient_id: new mongoose_3.Types.ObjectId(patientId),
            doctor_id: new mongoose_3.Types.ObjectId(doctorId),
            requested_lab_tests: labTests || [],
            requested_radiology_scans: radScans || [],
            home_care_recommendation_notes: homeCareNotes || null,
            prescription_routing_status: prescriptionStatus
        });
        return {
            success: true,
            message: 'تم حفظ الروشتة والإحالات التشخيصية، وإرسال التنبيهات الفورية للمريض.',
            referral_id: referral._id,
            routing_mode: prescriptionStatus
        };
    }
    async diagnosticCallback(appointmentId, body) {
        const referral = await this.referralModel.findOneAndUpdate({ appointment_id: new mongoose_3.Types.ObjectId(appointmentId) }, {
            $set: {
                diagnostic_results_returned: true,
            },
            $push: {
                returned_results_file_urls: { $each: body.fileUrls }
            }
        }, { new: true });
        if (!referral)
            throw new common_1.BadRequestException('No active medical referral found linking to this appointment ID.');
        return { success: true, message: 'تم ربط نتائج التحاليل المخبرية بملف الإحالة، وتنبيه الطبيب المعالج تلقائياً.' };
    }
};
exports.DoctorReferralsController = DoctorReferralsController;
__decorate([
    (0, common_1.Get)('my-referrals/:doctorId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('doctorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DoctorReferralsController.prototype, "myReferrals", null);
__decorate([
    (0, common_1.Post)('issue-referrals-and-prescription'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DoctorReferralsController.prototype, "issueReferralsAndPrescription", null);
__decorate([
    (0, common_1.Patch)('diagnostic-callback/:appointmentId'),
    __param(0, (0, common_1.Param)('appointmentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DoctorReferralsController.prototype, "diagnosticCallback", null);
exports.DoctorReferralsController = DoctorReferralsController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.NoGuestsGuard),
    (0, common_1.Controller)('provider/doctor-referrals'),
    __param(0, (0, mongoose_1.InjectModel)(encounter_referrals_schema_1.EncounterReferral.name)),
    __param(1, (0, mongoose_1.InjectModel)(doctor_profile_extended_schema_1.DoctorProfileExtended.name)),
    __param(2, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_3.Model,
        mongoose_3.Model,
        mongoose_3.Connection])
], DoctorReferralsController);
//# sourceMappingURL=doctor-referrals.controller.js.map