import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument } from '../../schemas/system-config.schema';

/**
 * SystemConfigController
 * Provides endpoints to get and update global system configuration.
 * Endpoint: /admin/governance/system-config
 */
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/governance/system-config')
export class SystemConfigController {
  constructor(@InjectModel(SystemConfig.name) private readonly configModel: Model<SystemConfigDocument>) {}

  @Get()
  async getConfig() {
    // We use a fixed key for the singleton config document.
    const key = 'system_config';
    let config = await this.configModel.findOne({ key }).lean();
    if (!config) {
      // Initialize empty config if not present.
      config = await this.configModel.create({ key, value: {} });
    }
    return { key: config.key, value: config.value };
  }

  @Put()
  async updateConfig(@Body() body: { value: any }) {
    const key = 'system_config';
    const updated = await this.configModel.findOneAndUpdate({ key }, { value: body.value }, { new: true, upsert: true }).lean();
    return { key: updated.key, value: updated.value };
  }
}
