import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDefined, IsString, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { ModuleSwitchesService } from './module-switches.service';

export class SetModuleDto {
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;

  @IsDefined()
  @IsString()
  @MinLength(3)
  reason!: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ModuleSwitchesController {
  constructor(private readonly switches: ModuleSwitchesService) {}

  @Public()
  @Get('modules')
  async read() {
    return { modules: await this.switches.modules() };
  }

  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MODULES_MANAGE)
  @Put('admin/modules/:key')
  async write(@Param('key') key: string, @Body() body: SetModuleDto, @CurrentUser() _u: any) {
    return this.switches.set(key, body.enabled, body.reason);
  }
}
