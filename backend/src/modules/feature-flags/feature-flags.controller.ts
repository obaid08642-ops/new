import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

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
  async setFlag(@Param('key') key: string, @Body('enabled') enabled: boolean) {
    return this.svc.setFlag(key, enabled);
  }
}
