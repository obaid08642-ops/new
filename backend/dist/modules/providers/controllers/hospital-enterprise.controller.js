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
exports.HospitalEnterpriseController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const hospital_sub_entity_schema_1 = require("../schemas/hospital-sub-entity.schema");
const user_schema_1 = require("../../../schemas/user.schema");
const appointment_schema_1 = require("../../../schemas/appointment.schema");
const provider_profile_schema_1 = require("../../../schemas/provider-profile.schema");
const enums_1 = require("../../../common/enums");
let HospitalEnterpriseController = class HospitalEnterpriseController {
    constructor(subEntityModel, userModel, appointmentModel, providerModel) {
        this.subEntityModel = subEntityModel;
        this.userModel = userModel;
        this.appointmentModel = appointmentModel;
        this.providerModel = providerModel;
    }
    async provisionSubProvider(payload) {
        const { hospitalId, branchId, staffUserId, entityType, permissions } = payload;
        const binding = await this.subEntityModel.create({
            parent_hospital_id: new mongoose_2.Types.ObjectId(hospitalId),
            assigned_branch_id: new mongoose_2.Types.ObjectId(branchId),
            sub_entity_user_id: new mongoose_2.Types.ObjectId(staffUserId),
            entity_type: entityType,
            custom_branch_permissions: permissions || [],
            is_active: true
        });
        await this.userModel.findByIdAndUpdate(staffUserId, {
            $set: {
                parent_provider_account_id: new mongoose_2.Types.ObjectId(hospitalId),
                assigned_branch_id: new mongoose_2.Types.ObjectId(branchId),
                verified: entityType === 'BRANCH_DOCTOR' ? true : undefined
            }
        });
        return {
            success: true,
            binding_id: binding._id,
            message: 'تم ربط وبناء الحساب الفرعي للمزود بنجاح تحت البنية الهرمية للمنشأة الطبية.'
        };
    }
    async getBranchStaff(hospitalId, branchId) {
        const staffMappings = await this.subEntityModel.find({
            parent_hospital_id: new mongoose_2.Types.ObjectId(hospitalId),
            assigned_branch_id: new mongoose_2.Types.ObjectId(branchId),
            is_active: true
        }).populate('sub_entity_user_id', 'full_name phone email role verified');
        return {
            success: true,
            staff: staffMappings.map(m => ({
                id: m._id,
                entity_type: m.entity_type,
                user: m.sub_entity_user_id
            }))
        };
    }
    async getBranchFinancials(hospitalId, branchId, securityContext) {
        if (!securityContext?.requestorId) {
            throw new common_1.ForbiddenException('حجبت الصلاحية. السياق الأمني غير مكتمل.');
        }
        const requestor = await this.userModel.findById(securityContext.requestorId);
        if (!requestor || requestor.role === enums_1.UserRole.RECEPTIONIST) {
            throw new common_1.ForbiddenException('حجبت الصلاحية. موظفو الاستقبال لا يملكون إذن الوصول للتقارير والبيانات المالية للمنشأة.');
        }
        const staff = await this.subEntityModel.find({ assigned_branch_id: new mongoose_2.Types.ObjectId(branchId), entity_type: 'BRANCH_DOCTOR' });
        const doctorUserIds = staff.map(s => s.sub_entity_user_id.toString());
        const providers = await this.providerModel.find({ user_id: { $in: doctorUserIds } });
        const providerIds = providers.map(p => p.id);
        const appointments = await this.appointmentModel.find({
            doctor_id: { $in: providerIds },
            status: { $in: ['COMPLETED', 'CONFIRMED'] }
        });
        let totalEscrow = 0;
        let cashCollected = 0;
        appointments.forEach(appt => {
            if (appt.payment_method === 'insurance') {
                totalEscrow += appt.total_price || 0;
            }
            else if (appt.payment_method === 'cash') {
                cashCollected += appt.total_price || 0;
            }
        });
        const walletBalance = totalEscrow + (appointments.filter(a => a.payment_method === 'card').reduce((acc, a) => acc + (a.total_price || 0), 0));
        return {
            success: true,
            branch_id: branchId,
            metrics: {
                total_escrow_claims: totalEscrow,
                cash_collected_sar: cashCollected,
                consolidated_wallet_balance: walletBalance
            }
        };
    }
};
exports.HospitalEnterpriseController = HospitalEnterpriseController;
__decorate([
    (0, common_1.Post)('provision-sub-provider'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalEnterpriseController.prototype, "provisionSubProvider", null);
__decorate([
    (0, common_1.Get)('branch-staff/:hospitalId/:branchId'),
    __param(0, (0, common_1.Param)('hospitalId')),
    __param(1, (0, common_1.Param)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HospitalEnterpriseController.prototype, "getBranchStaff", null);
__decorate([
    (0, common_1.Post)('branch-financials/:hospitalId/:branchId'),
    __param(0, (0, common_1.Param)('hospitalId')),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], HospitalEnterpriseController.prototype, "getBranchFinancials", null);
exports.HospitalEnterpriseController = HospitalEnterpriseController = __decorate([
    (0, common_1.Controller)('providers/enterprise'),
    __param(0, (0, mongoose_1.InjectModel)(hospital_sub_entity_schema_1.HospitalSubEntity.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(2, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(3, (0, mongoose_1.InjectModel)(provider_profile_schema_1.ProviderProfile.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], HospitalEnterpriseController);
//# sourceMappingURL=hospital-enterprise.controller.js.map