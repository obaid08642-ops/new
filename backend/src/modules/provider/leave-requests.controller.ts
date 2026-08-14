import { Body, Controller, Get, NotImplementedException, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
@Controller('provider/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  @Get()
  getLeaveRequests(@CurrentUser('id') facilityId: string) {
    void facilityId;
    throw new NotImplementedException('Leave-request persistence is not configured. This endpoint no longer returns fabricated requests.');
  }

  @Post('action')
  updateLeaveRequest(@Body() body: { id: string; action: 'approved' | 'rejected' }) {
    void body;
    throw new NotImplementedException('Leave-request persistence is not configured. This endpoint no longer reports fabricated success.');
  }
}
