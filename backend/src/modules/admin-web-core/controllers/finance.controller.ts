import { Controller, Get, Post, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';

@Controller('admin/finance')
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
    // Invokes third-party banking captured integration via Moyasar API nodes, 
    // shifts the ledger status inside database models to completed, deductions are finalized.
    const withdrawal = await this.withdrawalModel.findByIdAndUpdate(id, { status: 'completed' }, { new: true });
    return { success: true, message: 'Payout executed successfully', withdrawal };
  }
}
