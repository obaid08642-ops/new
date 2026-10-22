import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { OpsSecurityService } from './ops-security.service';
import { CreateIncidentDto, RecordRotationDto, UpdateIncidentDto } from './ops-security.dto';

import { Permission, RequirePermissions } from '../../../common/permissions';
/**
 * D-34 — admin "Operations & Security" page (decision 34), backend part.
 * Read-only for most admins; writes are super_admin only. Never returns a secret value.
 */
@Controller('admin/ops-security')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class OpsSecurityController {
  constructor(private readonly ops: OpsSecurityService) {}

  @Get()
  async page() {
    return this.ops.page();
  }

  @RequirePermissions(Permission.SECURITY_MANAGE)
  @Post('secrets/:name/rotated')
  @Roles(UserRole.SUPER_ADMIN)
  async recordRotation(@Param('name') name: string, @Body() body: RecordRotationDto) {
    return this.ops.recordRotation(name, body?.owner);
  }

  @RequirePermissions(Permission.SECURITY_MANAGE)
  @Post('incidents')
  @Roles(UserRole.SUPER_ADMIN)
  async createIncident(@Body() body: CreateIncidentDto) {
    return this.ops.createIncident(body);
  }

  @RequirePermissions(Permission.SECURITY_MANAGE)
  @Patch('incidents/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async updateIncident(@Param('id') id: string, @Body() body: UpdateIncidentDto) {
    return this.ops.updateIncident(id, body.status);
  }
}
