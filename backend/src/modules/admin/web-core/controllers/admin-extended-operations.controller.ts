import { Controller, Get, Patch, Param, Body, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';
import { CurrentUser, Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { IssueWarehouseQuotationDto } from './admin-extended-operations.dto';

import { Permission, RequirePermissions } from '../../../../common/permissions';
@Controller('admin/extended-operations')
@Roles(UserRole.ADMIN)
export class AdminExtendedOperationsController {
  constructor(
    @InjectModel(ProcurementRequest.name) private procurementModel: Model<ProcurementRequest>
  ) {}

  @Get('procurement/pending')
  async getPendingProcurement() {
    const data = await this.procurementModel.find({ status: 'PENDING_ADMIN_REVIEW' }).exec();
    return { data };
  }

  // NOTE: provider edit-review ("delta") commit was removed from here — it marked
  // deltas APPROVED with a placeholder instead of applying them. The canonical,
  // applying path is /providers/provider-deltas/:id/approve (provider module).

  @RequirePermissions(Permission.PHARMACY_INVENTORY_EDIT)
  @Patch('issue-quote/:procurementId')
  async issueWarehouseQuotation(
    @Param('procurementId') procurementId: string,
    @Body() body: IssueWarehouseQuotationDto,
    @CurrentUser() admin?: any,
  ) {
    // Prices a pharmacy B2B shortage. procurementId is the procurement Mongo `_id` (the create endpoint returns `request._id`).
    // A quote can only be issued while the request waits for admin review: an already quoted, completed or cancelled request is
    // never re-priced (the pharmacy may already have answered the earlier quote). The status is part of the update filter, so two
    // admins pricing the same request cannot both win.
    if (!Types.ObjectId.isValid(procurementId)) throw new BadRequestException('B2B procurement ticket reference index not registered.');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const updatedProcurement = await this.procurementModel.findOneAndUpdate(
      { _id: procurementId, status: 'PENDING_ADMIN_REVIEW' },
      {
        $set: {
          items: body.pricingItems,
          total_warehouse_quotation_price: body.totalPrice,
          status: 'QUOTATION_ISSUED',
          quote_issued_by: admin?.id || admin?._id || null,
          quote_issued_at: new Date(),
          ...(reason ? { quote_reason: reason } : {}),
        },
      },
      { new: true },
    );
    if (!updatedProcurement) {
      const current: any = await this.procurementModel.findById(procurementId).select('status').lean().exec();
      if (!current) throw new BadRequestException('B2B procurement ticket reference index not registered.');
      throw new ConflictException(`quote_not_allowed_in_status_${String(current.status).toLowerCase()}`);
    }
    return { success: true, message: 'تمت صياغة تسعيرة المستودع بنجاح، وترحيل الفاتورة للصيدلية للتأكيد والدفع.' };
  }
}
