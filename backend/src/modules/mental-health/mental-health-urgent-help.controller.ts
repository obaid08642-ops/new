import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { UrgentHelpDto } from './mental-health.dto';

/** system_configs key of the one "Need urgent help?" number (owner decision 8). Never hard-coded: null until the admin sets it. */
export const URGENT_HELP_KEY = 'mental_health_urgent_help';

@ApiTags('Mental Health – الصحة النفسية')
@Controller()
export class MentalHealthUrgentHelpController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async read(): Promise<{ phone: string | null; updated_at: Date | null }> {
    const doc: any = await this.conn.collection('system_configs').findOne({ key: URGENT_HELP_KEY });
    const phone = typeof doc?.value?.phone === 'string' && doc.value.phone.trim() ? doc.value.phone.trim() : null;
    return { phone, updated_at: doc?.updated_at ?? null };
  }

  /** GET /api/v1/mental-health/urgent-help — public; the apps dial this number. */
  @Public()
  @Get('mental-health/urgent-help')
  @ApiOperation({ summary: 'The urgent-help phone number set by the admin / رقم المساعدة العاجلة' })
  get() {
    return this.read();
  }

  /** PUT /api/v1/admin/mental-health/urgent-help — admin only, audited. */
  @Put('admin/mental-health/urgent-help')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set the urgent-help phone number (admin) / تعيين رقم المساعدة العاجلة' })
  async set(@Body() body: UrgentHelpDto, @CurrentUser() admin: any) {
    const before = await this.read();
    const phone = body.phone.trim();
    const now = new Date();
    await this.conn.collection('system_configs').updateOne(
      { key: URGENT_HELP_KEY },
      { $set: { key: URGENT_HELP_KEY, value: { phone }, updated_at: now, updated_by: admin?.id ?? null }, $setOnInsert: { created_at: now } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `urgent_help_${now.getTime()}`,
      action: 'mental_health_urgent_help_update',
      resource_kind: 'system_config',
      resource_id: `system_config:${URGENT_HELP_KEY}`,
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { before: before.phone, after: phone },
      created_at: now,
    });
    return this.read();
  }
}
