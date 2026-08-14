import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';

@Controller('pharmacy/procurement')
export class ProcurementController {
  constructor(@InjectModel(ProcurementRequest.name) private procurementModel: Model<ProcurementRequest>) {}

  @Post('submit-request')
  async createProcurementRequest(@Body() dto: any) {
    // Commit the B2B warehouse inventory order directly to the DB for Admin validation
    const request = await this.procurementModel.create({
      pharmacy_id: new Types.ObjectId(dto.pharmacyId),
      created_by: new Types.ObjectId(dto.userId),
      items: dto.items || [],
      uploaded_file_url: dto.fileUrl || null,
      status: 'PENDING_ADMIN_REVIEW'
    });
    return { success: true, procurement_id: request._id, message: 'تم إرسال طلب النواقص بنجاح وجاري مراجعته من قبل إدارة المستودعات.' };
  }

  @Get('my-requests/:pharmacyId')
  async listRequests(@Param('pharmacyId') pharmacyId: string) {
    const list = await this.procurementModel.find({ pharmacy_id: new Types.ObjectId(pharmacyId) }).sort({ createdAt: -1 });
    return { success: true, data: list };
  }
}
