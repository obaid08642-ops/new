import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AdminDeviceService } from './admin-device.service';
import { EnrollDto, SetLockDto } from './admin-devices.dto';

/** This-device-only admin access (device-bound, never IP-bound). */
@Controller('admin/devices')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminDevicesController {
  constructor(private readonly devices: AdminDeviceService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.devices.list(user.id);
  }

  @Post('enroll')
  enroll(@CurrentUser() user: any, @Req() req: any, @Body() body: EnrollDto) {
    const id = String(body?.device_id || req.headers?.['x-admin-device'] || '');
    if (!id || id.length < 16) throw new BadRequestException('device_id_required');
    return this.devices.enroll(user.id, id, req.headers?.['user-agent'], body?.name);
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
