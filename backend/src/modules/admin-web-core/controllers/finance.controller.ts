import { Controller, Get, Post, Param, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class FinanceController {
  constructor(
    @InjectModel(CommissionLedger.name) private commissionModel: Model<CommissionLedger>,
    @InjectModel(WithdrawalRequest.name) private withdrawalModel: Model<WithdrawalRequest>
  ) {}

  @Get('commissions')
  async getCommissions() {
    const data = await this.commissionModel.find().exec();
    return { data };
  }

  @Get('withdrawals/pending')
  async getPendingWithdrawals() {
    const data = await this.withdrawalModel.find({ status: 'pending' }).exec();
    return { data };
  }

  @Post('withdrawals/:id/execute')
  async executePayout(@Param('id') id: string) {
    throw new ServiceUnavailableException('Payout execution is disabled until a verified payout provider, immutable settlement ledger, and reconciliation workflow are integrated.');
  }
}
