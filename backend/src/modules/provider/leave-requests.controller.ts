import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

@Controller('provider/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  
  @Get()
  getLeaveRequests(@CurrentUser('id') facilityId: string) {
    // Return mocked leave requests associated with this facility
    return [
      { id: 'l1', providerName: 'د. أحمد محمود', providerType: 'Doctor', type: 'vacation', startDate: '2026-08-01', endDate: '2026-08-15', reason: 'إجازة سنوية', status: 'pending' },
      { id: 'l2', providerName: 'صيدلية الأمل', providerType: 'Pharmacy', type: 'emergency', startDate: '2026-07-20', endDate: '2026-07-21', reason: 'عطل فني في النظام', status: 'pending' },
      { id: 'l3', providerName: 'مختبر ألفا', providerType: 'Lab', type: 'vacation', startDate: '2026-09-01', endDate: '2026-09-07', reason: 'صيانة دورية', status: 'approved' },
    ];
  }

  @Post('action')
  updateLeaveRequest(@Body() body: { id: string; action: 'approved' | 'rejected' }) {
    // In a real app, update DB. Here we just return success.
    return { success: true, message: `Request ${body.id} has been ${body.action}` };
  }
}
