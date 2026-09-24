import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/auth.guard';
import { Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';

@Controller('admin/config')
@UseGuards(JwtAuthGuard)
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

  @Roles(UserRole.ADMIN)
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
