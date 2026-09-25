import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../../common/auth.guard';
import { Roles, CurrentUser } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { SlaDto } from './admin-config.dto';

const SLA_KEY = 'sla';
const SLA_DEFAULTS = { consultationDuration: 15, callRingingDuration: 45, jwtExpiry: 24 };

/** F45: SLA timers persist in system_configs (key 'sla'), every change audit-logged. */
@Controller('admin/config')
@UseGuards(JwtAuthGuard)
export class AdminConfigController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get('sla')
  @Roles(UserRole.ADMIN)
  async getSLA() {
    const doc = await this.conn.collection('system_configs').findOne({ key: SLA_KEY });
    return { ...(doc?.value || SLA_DEFAULTS), systemStatus: 'online' };
  }

  @Roles(UserRole.ADMIN)
  @Put('sla')
  @Roles(UserRole.ADMIN)
  async updateSLA(@Body() body: SlaDto, @CurrentUser() admin: any) {
    const value = { ...SLA_DEFAULTS, ...body };
    await this.conn.collection('system_configs').updateOne(
      { key: SLA_KEY },
      { $set: { key: SLA_KEY, value, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `sla_${Date.now()}`,
      action: 'sla_update',
      resource_kind: 'system_config',
      resource_id: `system_config:${SLA_KEY}`,
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { value },
      created_at: new Date(),
    });
    return { ...(await this.conn.collection('system_configs').findOne({ key: SLA_KEY }))?.value, systemStatus: 'online' };
  }
}
