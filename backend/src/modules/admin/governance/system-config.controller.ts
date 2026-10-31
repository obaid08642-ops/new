import { BadRequestException, Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, Public } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument } from '../../../schemas/system-config.schema';
import { UpdateConfigDto } from './system-config.dto';
import { DEFAULT_REFUND_POLICY } from '../../refund-policy/refund-policy.defaults';

import { Permission, RequirePermissions } from '../../../common/permissions';
/**
 * SystemConfigController
 * Provides endpoints to get and update global system configuration.
 * Endpoint: /admin/governance/system-config
 */
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/governance/system-config')
@Roles(UserRole.ADMIN)
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

  @RequirePermissions(Permission.SETTINGS_EDIT)
  @Put()
  async updateConfig(@Body() body: UpdateConfigDto) {
    const key = 'system_config';
    // R4-2: free-form admin JSON goes under an explicit $set with a size cap.
    const raw = JSON.stringify(body?.value ?? {});
    if (raw.length > 65536) throw new BadRequestException('config_value_too_large');
    const updated = await this.configModel.findOneAndUpdate({ key: { $eq: key } }, { $set: { value: body.value } }, { new: true, upsert: true }).lean();
    return { key: updated.key, value: updated.value };
  }
}

/** F23: public policy texts (no secrets) — separate controller so class-level
 * admin @Roles never applies to this route. */
@Controller('system-config')
export class PublicSystemConfigController {
  constructor(@InjectModel(SystemConfig.name) private readonly configModel: Model<SystemConfigDocument>) {}

  @Public()
  @Get('public')
  async getPublic() {
    const doc = await this.configModel.findOne({ key: 'system_config' }).lean();
    const v: any = doc?.value || {};
    // One source for the consultation refund numbers: `refund_policy` (what the server applies when it cancels). The old
    // `cancellation_policy` figures are never shown for them: the full refund starts at `full_refund_min_hours` and any later
    // cancel gets `late_refund_percent`, so there is no separate half-refund window (`half_hours` 0).
    const refundDoc: any = await this.configModel.findOne({ key: 'refund_policy' }).lean();
    const consultation = refundDoc?.value?.consultation || DEFAULT_REFUND_POLICY.consultation;
    return {
      cancellation_policy: {
        ...(v.cancellation_policy || {}),
        full_hours: consultation.full_refund_min_hours ?? DEFAULT_REFUND_POLICY.consultation.full_refund_min_hours,
        half_hours: 0,
        half_refund_percent: consultation.late_refund_percent ?? DEFAULT_REFUND_POLICY.consultation.late_refund_percent,
      },
      returns_policy: v.returns_policy || null,
    };
  }
}
