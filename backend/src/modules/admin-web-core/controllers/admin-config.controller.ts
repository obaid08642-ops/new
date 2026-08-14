import { Controller, Get, Put, Body, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
@Controller('admin/config')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminConfigController {

  @Get('sla')
  @Roles(UserRole.ADMIN)
  async getSLA() {
    throw new ServiceUnavailableException('Runtime SLA configuration is unavailable until it is backed by an audited configuration store and deployment propagation contract.');
  }

  @Put('sla')
  @Roles(UserRole.ADMIN)
  async updateSLA(@Body() body: any) {
    throw new ServiceUnavailableException('Runtime SLA configuration changes are disabled until they are persisted, audited, and propagated through a verified configuration contract.');
  }
}
