import { Controller, Post, Body, Get, Param, Patch, UseGuards, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HospitalSubEntity } from '../schemas/hospital-sub-entity.schema';
import { User } from '../../../schemas/user.schema';
import { Appointment } from '../../../schemas/appointment.schema';
import { ProviderProfile } from '../../../schemas/provider-profile.schema';
import { UserRole } from '../../../common/enums';

@Controller('providers/enterprise')
export class HospitalEnterpriseController {
  constructor(
    @InjectModel(HospitalSubEntity.name) private subEntityModel: Model<HospitalSubEntity>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(ProviderProfile.name) private providerModel: Model<ProviderProfile>
  ) {}

  @Post('provision-sub-provider')
  async provisionSubProvider(@Body() payload: any) {
    const { hospitalId, branchId, staffUserId, entityType, permissions } = payload;

    // Create the transactional binding mapping the provider sub-account underneath the hospital
    const binding = await this.subEntityModel.create({
      parent_hospital_id: new Types.ObjectId(hospitalId),
      assigned_branch_id: new Types.ObjectId(branchId),
      sub_entity_user_id: new Types.ObjectId(staffUserId),
      entity_type: entityType,
      custom_branch_permissions: permissions || [],
      is_active: true
    });

    // Update the targeted sub-account user record credentials to hook parent identities
    await this.userModel.findByIdAndUpdate(staffUserId, {
      $set: {
        parent_provider_account_id: new Types.ObjectId(hospitalId),
        assigned_branch_id: new Types.ObjectId(branchId),
        verified: entityType === 'BRANCH_DOCTOR' ? true : undefined // Auto-approve doctors
      }
    });

    return { 
      success: true, 
      binding_id: binding._id, 
      message: 'تم ربط وبناء الحساب الفرعي للمزود بنجاح تحت البنية الهرمية للمنشأة الطبية.' 
    };
  }

  @Get('branch-staff/:hospitalId/:branchId')
  async getBranchStaff(
    @Param('hospitalId') hospitalId: string,
    @Param('branchId') branchId: string
  ) {
    const staffMappings = await this.subEntityModel.find({
      parent_hospital_id: new Types.ObjectId(hospitalId),
      assigned_branch_id: new Types.ObjectId(branchId),
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

  @Post('branch-financials/:hospitalId/:branchId')
  async getBranchFinancials(
    @Param('hospitalId') hospitalId: string,
    @Param('branchId') branchId: string,
    @Body() securityContext: { requestorId: string }
  ) {
    // ENFORCE SECURITY WALL
    if (!securityContext?.requestorId) {
      throw new ForbiddenException('حجبت الصلاحية. السياق الأمني غير مكتمل.');
    }

    const requestor = await this.userModel.findById(securityContext.requestorId);
    if (!requestor || requestor.role === UserRole.RECEPTIONIST) {
      throw new ForbiddenException('حجبت الصلاحية. موظفو الاستقبال لا يملكون إذن الوصول للتقارير والبيانات المالية للمنشأة.');
    }

    // Actual Calculation Engine
    // 1. Get all doctors under this branch
    const staff = await this.subEntityModel.find({ assigned_branch_id: new Types.ObjectId(branchId), entity_type: 'BRANCH_DOCTOR' });
    const doctorUserIds = staff.map(s => s.sub_entity_user_id.toString());
    
    // Convert User IDs to Provider IDs
    const providers = await this.providerModel.find({ user_id: { $in: doctorUserIds } });
    const providerIds = providers.map(p => p.id);

    // 2. Aggregate financials from appointments
    const appointments = await this.appointmentModel.find({
      doctor_id: { $in: providerIds },
      status: { $in: ['COMPLETED', 'CONFIRMED'] }
    });

    let totalEscrow = 0;
    let cashCollected = 0;

    appointments.forEach(appt => {
      if (appt.payment_method === 'insurance') {
        totalEscrow += appt.total_price || 0;
      } else if (appt.payment_method === 'cash') {
        cashCollected += appt.total_price || 0;
      }
    });

    // Assume Wallet Balance = Escrow + completed Card payments (simplified for corporate)
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
}
