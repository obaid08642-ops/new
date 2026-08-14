import { Controller, Post, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { User, UserDocument } from '../../schemas/user.schema';
import { ProviderDelta } from '../providers/schemas/provider-delta.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN) // Globally secures this controller to ADMIN only
export class AdminController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProviderDelta.name) private readonly deltaModel: Model<any>
  ) {}

  /**
   * Manually approve a Doctor or Pharmacy (ensures 'verified: boolean' blocks booking until Admin approves).
   */
  @Post('approve/:userId')
  async approveProvider(@Param('userId') userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('user_not_found');
    if (![UserRole.DOCTOR, UserRole.PHARMACY].includes(user.role)) {
      throw new BadRequestException('user_not_a_provider');
    }
    
    user.verified = true;
    await user.save();
    return { ok: true, message: 'provider_verified' };
  }

  @Post('suspend/:userId')
  async suspendProvider(@Param('userId') userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('user_not_found');
    
    user.suspended = true;
    user.verified = false;
    await user.save();
    return { ok: true, message: 'provider_suspended' };
  }

  // --- DELTA AUDIT GUARD ENDPOINTS ---

  @Post('provider-deltas')
  async getPendingDeltas() {
    const deltas = await this.deltaModel.find({ status: 'pending' }).exec();
    return deltas;
  }

  @Post('provider-deltas/:deltaId/approve')
  async approveDelta(@Param('deltaId') deltaId: string) {
    const delta = await this.deltaModel.findById(deltaId);
    if (!delta) throw new BadRequestException('delta_not_found');

    delta.status = 'approved';
    await delta.save();

    // Here we would apply the requested_changes to the actual ProviderProfile
    // e.g., await this.profileModel.updateOne({ account_id: delta.provider_id }, { $set: delta.requested_changes })
    
    return { ok: true, message: 'delta_approved' };
  }

  @Post('provider-deltas/:deltaId/reject')
  async rejectDelta(@Param('deltaId') deltaId: string) {
    const delta = await this.deltaModel.findById(deltaId);
    if (!delta) throw new BadRequestException('delta_not_found');

    delta.status = 'rejected';
    await delta.save();
    
    return { ok: true, message: 'delta_rejected' };
  }
}
