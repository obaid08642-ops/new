import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { Permission, RequirePermissions } from '../../../../common/permissions';

@Controller('admin/finance')
@Roles(UserRole.ADMIN)
export class FinanceController {
  constructor(
    @InjectModel(CommissionLedger.name) private commissionModel: Model<CommissionLedger>,
  ) {}

  // Per-transaction commission records (commissions.tsx, financial-ledger.tsx). It was GET /admin/finance/commissions,
  // the same route as the finance suite's commission report, so only one of them could ever answer.
  @Get('commissions/records')
  @RequirePermissions(Permission.FINANCE_READ)
  async getCommissions() {
    const data = await this.commissionModel.find().exec();
    return { data };
  }
}
