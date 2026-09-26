import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { SetFeatureFlagDto } from './feature-flags.dto';
import { JwtAuthGuard, Roles, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';


@Controller('feature-flags')
@Roles(UserRole.ADMIN)
export class PublicFeatureFlagsController {
  constructor(private svc: FeatureFlagsService) {}

  /** Mobile apps read remote flags at startup — remote enable/disable without app update. */
  @Public()
  @Get()
  async all() {
    return this.svc.getAll();
  }
}

@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly svc: FeatureFlagsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getAll() {
    return this.svc.getAll();
  }

  @Post(':key')
  @Roles(UserRole.ADMIN)
  async setFlag(@Param('key') key: string, @Body() body: SetFeatureFlagDto) {
    return this.svc.setFlag(key, body.enabled);
  }
}
