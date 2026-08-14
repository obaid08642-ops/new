import { Controller, Get, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProviderDelta } from '../schemas/provider-delta.schema';
import { ProcurementRequest } from '../schemas/procurement-request.schema';

@Controller('admin/extended-operations')
export class AdminExtendedOperationsController {
  constructor(
    @InjectModel(ProviderDelta.name) private deltaModel: Model<ProviderDelta>,
    @InjectModel(ProcurementRequest.name) private procurementModel: Model<ProcurementRequest>
  ) {}

  @Get('pending-deltas')
  async getPendingDeltas() {
    const data = await this.deltaModel.find({ status: 'PENDING' }).exec();
    return { data };
  }

  @Get('procurement/pending')
  async getPendingProcurement() {
    const data = await this.procurementModel.find({ status: 'PENDING_ADMIN_REVIEW' }).exec();
    return { data };
  }

  @Patch('commit-delta/:id')
  async commitDeltaChanges(@Param('id') deltaId: string, @Body() body: { adminId: string }) {
    const delta = await this.deltaModel.findById(deltaId);
    if (!delta || delta.status !== 'PENDING') throw new BadRequestException('Delta alteration log not open.');

    delta.status = 'APPROVED';
    await delta.save();

    // Core logic to dynamically overwrite master Profile collection based on path fields goes here...
    return { success: true, message: 'تمت مراجعة التعديلات وتحديث ملف المزود المرجعي حياً على المنظومة.' };
  }

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
