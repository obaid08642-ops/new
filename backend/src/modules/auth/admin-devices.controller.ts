import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AdminDeviceService } from './admin-device.service';
import { AdminDeviceApprovalService } from './admin-device-approval.service';
import { EnrollDto, SetLockDto, ConfirmDeviceDto } from './admin-devices.dto';

/**
 * This-device-only admin access (device-bound, never IP-bound).
 *
 * D-35: a new device never enrols by asking. It requests (202
 * pending_approval + e-mailed code), an enrolled device approves, and the new
 * device confirms with the code. At most 2 active devices per admin.
 */
@Controller('admin/devices')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminDevicesController {
  constructor(
    private readonly devices: AdminDeviceService,
    private readonly approval: AdminDeviceApprovalService,
  ) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.devices.listWithIds(user.id);
  }

  @Post('enroll')
  @HttpCode(202)
  async enroll(@CurrentUser() user: any, @Req() req: any, @Body() body: EnrollDto) {
    const id = String(body?.device_id || req.headers?.['x-admin-device'] || '');
    return this.approval.request(user.id, id, body?.name);
  }

  @Get('requests')
  async requests(@CurrentUser() user: any, @Req() req: any) {
    return this.approval.listRequests(user.id, String(req.headers?.['x-admin-device'] || ''));
  }

  @Post('requests/:id/approve')
  async approve(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    return this.approval.approve(user.id, id, String(req.headers?.['x-admin-device'] || ''));
  }

  @Post('requests/:id/confirm')
  async confirm(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: ConfirmDeviceDto) {
    return this.approval.confirm(user.id, id, String(req.headers?.['x-admin-device'] || ''), body?.code, req.headers?.['user-agent']);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.devices.revoke(user.id, id);
  }

  @Post('lock')
  setLock(@CurrentUser() user: any, @Req() req: any, @Body() body: SetLockDto) {
    const id = String(req.headers?.['x-admin-device'] || '');
    return this.devices.setLock(user.id, body?.enabled !== false, id, req.headers?.['user-agent']);
  }
}
