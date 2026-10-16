import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { SetKillSwitchDto } from './kill-switches.dto';
import { KillSwitchesService } from './kill-switches.service';

/** Admin kill switches (issues 955 / 995). Same permission as the module switches: super admin only (modules.manage). */
@Controller('kill-switches')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.MODULES_MANAGE)
export class KillSwitchesController {
  constructor(private readonly switches: KillSwitchesService) {}

  @Get()
  list() {
    return this.switches.list();
  }

  @Post(':key')
  toggle(@Param('key') key: string, @Body() body: SetKillSwitchDto, @CurrentUser() admin: { id?: string; role?: string; email?: string; full_name?: string }) {
    return this.switches.set(key, body.value, body.reason, admin);
  }
}
