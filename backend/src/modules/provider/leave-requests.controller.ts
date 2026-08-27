import { Body, Controller, Get, Post, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { LeaveRequestDocument } from '../../schemas/leave-request.schema';

@Controller('provider/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(
    @InjectModel('LeaveRequest') private readonly leaveModel: Model<LeaveRequestDocument>,
  ) {}

  @Get()
  async getLeaveRequests(@CurrentUser() facility: any, @Body() _: any) {
    return this.leaveModel
      .find({ facility_id: facility.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  }

  @Post()
  async createLeaveRequest(
    @CurrentUser() user: any,
    @Body() body: { facility_id?: string; type?: string; start_date: string; end_date: string; reason?: string; provider_name?: string; provider_type?: string },
  ) {
    if (!body?.start_date || !body?.end_date) throw new BadRequestException('start_date and end_date are required');
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new BadRequestException('invalid date range');
    }
    const doc = await this.leaveModel.create({
      facility_id: body.facility_id || user.id,
      provider_account_id: user.id,
      provider_name: body.provider_name || user.full_name,
      provider_type: body.provider_type || user.role,
      type: body.type || 'vacation',
      start_date: start,
      end_date: end,
      reason: body.reason,
      status: 'pending',
    });
    return doc.toObject();
  }

  @Post('action')
  async updateLeaveRequest(
    @CurrentUser() facility: any,
    @Body() body: { id: string; action: 'approved' | 'rejected'; note?: string },
  ) {
    if (!body?.id || !['approved', 'rejected'].includes(body?.action)) {
      throw new BadRequestException('id and a valid action (approved|rejected) are required');
    }
    const doc = await this.leaveModel.findOneAndUpdate(
      { id: body.id, facility_id: facility.id, status: 'pending' },
      { $set: { status: body.action, decided_by: facility.id, decided_at: new Date(), decision_note: body.note } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('pending leave request not found for this facility');
    return { success: true, id: doc.id, status: doc.status };
  }
}
