import { Controller, Post, Body, Get, Param, Patch, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HospitalSubEntity } from '../schemas/hospital-sub-entity.schema';
import { User } from '../../../schemas/user.schema';
import { Appointment } from '../../../schemas/appointment.schema';
import { ProviderProfile } from '../../../schemas/provider-profile.schema';
import { UserRole } from '../../../common/enums';
import { Roles } from '../../../common/auth.guard';
import { GetBranchFinancialsDto, ProvisionSubProviderDto } from './hospital-enterprise.dto';

@Controller('providers/enterprise')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
export class HospitalEnterpriseController {
  constructor(
    @InjectModel(HospitalSubEntity.name) private subEntityModel: Model<HospitalSubEntity>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(ProviderProfile.name) private providerModel: Model<ProviderProfile>
  ) {}

  private objectId(value: string, field: string): Types.ObjectId {
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) throw new BadRequestException(`${field}_must_be_object_id`);
    return new Types.ObjectId(value);
  }

  @Post('provision-sub-provider')
  async provisionSubProvider(@Body() payload: ProvisionSubProviderDto) {
    const { hospitalId, branchId, staffUserId, entityType, permissions } = payload;

    // hospitalId/branchId/staffUserId are always Mongo ObjectIds —
    // enforced by @IsMongoId() on ProvisionSubProviderDto.
    // Create the transactional binding mapping the provider sub-account underneath the hospital
    const hospitalObjectId = this.objectId(hospitalId, 'hospitalId');
    const branchObjectId = this.objectId(branchId, 'branchId');
    const staffObjectId = this.objectId(staffUserId, 'staffUserId');
    const binding = await this.subEntityModel.create({
      parent_hospital_id: hospitalObjectId,
      assigned_branch_id: branchObjectId,
      sub_entity_user_id: staffObjectId,
      entity_type: entityType,
      custom_branch_permissions: permissions || [],
      is_active: true
    });

    // Update the targeted sub-account user record credentials to hook parent identities
    await this.userModel.findOneAndUpdate({ _id: { $eq: staffObjectId } }, {
      $set: {
        parent_provider_account_id: hospitalObjectId,
        assigned_branch_id: branchObjectId,
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
    // Route ids are Mongo ObjectIds here: both come from the provisioned
    // sub-entity binding created above (never client uuids).
    const staffMappings = await this.subEntityModel.find({
      parent_hospital_id: { $eq: this.objectId(hospitalId, 'hospitalId') },
      assigned_branch_id: { $eq: this.objectId(branchId, 'branchId') },
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
    @Body() securityContext: GetBranchFinancialsDto
  ) {
    // ENFORCE SECURITY WALL
    if (!securityContext?.requestorId) {
      throw new ForbiddenException('حجبت الصلاحية. السياق الأمني غير مكتمل.');
    }

    // requestorId is always a Mongo ObjectId (enforced by @IsMongoId());
    // branchId is the provisioned binding id from above, never a client uuid.
    const requestor = await this.userModel.findOne({ _id: { $eq: this.objectId(securityContext.requestorId, 'requestorId') } });
    if (!requestor || requestor.role === UserRole.RECEPTIONIST) {
      throw new ForbiddenException('حجبت الصلاحية. موظفو الاستقبال لا يملكون إذن الوصول للتقارير والبيانات المالية للمنشأة.');
    }

    // Actual Calculation Engine
    // 1. Get all doctors under this branch
    const branchObjectId = this.objectId(branchId, 'branchId');
    const staff = await this.subEntityModel.find({ assigned_branch_id: { $eq: branchObjectId }, entity_type: 'BRANCH_DOCTOR' });
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
