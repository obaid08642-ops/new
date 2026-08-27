import { Controller, Get, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';

@Controller('admin/extended-operations')
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

  @Patch('issue-quote/:procurementId')
  async issueWarehouseQuotation(
    @Param('procurementId') procurementId: string, 
    @Body() body: { pricingItems: any[], totalPrice: number }
  ) {
    // Intercepts Admin entry sheet inputs to price pharmacy B2B shortages
    const updatedProcurement = await this.procurementModel.findByIdAndUpdate(
      procurementId,
      {
        $set: {
          items: body.pricingItems,
          total_warehouse_quotation_price: body.totalPrice,
          status: 'QUOTATION_ISSUED'
        }
      },
      { new: true }
    );

    if (!updatedProcurement) throw new BadRequestException('B2B procurement ticket reference index not registered.');
    return { success: true, message: 'تمت صياغة تسعيرة المستودع بنجاح، وترحيل الفاتورة للصيدلية للتأكيد والدفع.' };
  }
}
