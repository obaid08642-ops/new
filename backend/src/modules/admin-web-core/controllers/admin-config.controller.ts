import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserRole, Roles, RolesGuard } from '../guards/roles.guard';

@Controller('admin/config')
@UseGuards(RolesGuard)
export class AdminConfigController {

  @Get('sla')
  @Roles(UserRole.ADMIN)
  async getSLA() {
    return {
      consultationDuration: 15,
      callRingingDuration: 45,
      jwtExpiry: 24,
      systemStatus: 'online'
    };
  }

  @Put('sla')
  @Roles(UserRole.ADMIN)
  async updateSLA(@Body() body: any) {
    // In reality this updates SystemConfigExtended in DB
    return {
      status: 'success',
      data: body
    };
  }
}
