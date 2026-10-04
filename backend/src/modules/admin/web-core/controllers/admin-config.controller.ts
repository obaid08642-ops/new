import { Controller, Get, Put, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../../../common/auth.guard';
import { Roles, CurrentUser } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { SlaDto, AppVersionsDto, DisputeConfigDto, OrdersConsoleConfigDto } from './admin-config.dto';

const SLA_KEY = 'sla';
const SLA_DEFAULTS = { consultationDuration: 15, callRingingDuration: 45, jwtExpiry: 24 };

const DISPUTE_CONFIG_KEY = 'dispute_config';
const DISPUTE_CONFIG_DEFAULTS = { max_refund_sar: 2000 };

const ORDERS_CONSOLE_CONFIG_KEY = 'orders_console_config';
const ORDERS_CONSOLE_CONFIG_DEFAULTS = { compensation_max_sar: 500 };

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
    delete (value as any).reason;
    delete (value as any).systemStatus;
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
      metadata: { value, reason: (body as any)?.reason || null },
      created_at: new Date(),
    });
    return { ...(await this.conn.collection('system_configs').findOne({ key: SLA_KEY }))?.value, systemStatus: 'online' };
  }

  /** 7B-B4: per-dispute refund cap (audited). Read by the disputes controller. */
  @Get('dispute-config')
  @Roles(UserRole.ADMIN)
  async getDisputeConfig() {
    const doc = await this.conn.collection('system_configs').findOne({ key: DISPUTE_CONFIG_KEY });
    return { ...DISPUTE_CONFIG_DEFAULTS, ...(doc?.value || {}) };
  }

  @Put('dispute-config')
  @Roles(UserRole.ADMIN)
  async updateDisputeConfig(@Body() body: DisputeConfigDto, @CurrentUser() admin: any) {
    const value: any = { ...DISPUTE_CONFIG_DEFAULTS };
    if (body?.max_refund_sar !== undefined) {
      const n = Number(body.max_refund_sar);
      if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('max_refund_sar must be a positive number');
      value.max_refund_sar = n;
    }
    await this.conn.collection('system_configs').updateOne(
      { key: DISPUTE_CONFIG_KEY },
      { $set: { key: DISPUTE_CONFIG_KEY, value, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `dispute_config_${Date.now()}`,
      action: 'dispute_config_update',
      resource_kind: 'system_config',
      resource_id: `system_config:${DISPUTE_CONFIG_KEY}`,
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { value, reason: (body as any)?.reason || null },
      created_at: new Date(),
    });
    return value;
  }

  /** 7B-B4: goodwill compensation cap (audited). Read by the orders console. */
  @Get('orders-console-config')
  @Roles(UserRole.ADMIN)
  async getOrdersConsoleConfig() {
    const doc = await this.conn.collection('system_configs').findOne({ key: ORDERS_CONSOLE_CONFIG_KEY });
    return { ...ORDERS_CONSOLE_CONFIG_DEFAULTS, ...(doc?.value || {}) };
  }

  @Put('orders-console-config')
  @Roles(UserRole.ADMIN)
  async updateOrdersConsoleConfig(@Body() body: OrdersConsoleConfigDto, @CurrentUser() admin: any) {
    const value: any = { ...ORDERS_CONSOLE_CONFIG_DEFAULTS };
    if (body?.compensation_max_sar !== undefined) {
      const n = Number(body.compensation_max_sar);
      if (!Number.isFinite(n) || n <= 0) throw new BadRequestException('compensation_max_sar must be a positive number');
      value.compensation_max_sar = n;
    }
    await this.conn.collection('system_configs').updateOne(
      { key: ORDERS_CONSOLE_CONFIG_KEY },
      { $set: { key: ORDERS_CONSOLE_CONFIG_KEY, value, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `orders_console_config_${Date.now()}`,
      action: 'orders_console_config_update',
      resource_kind: 'system_config',
      resource_id: `system_config:${ORDERS_CONSOLE_CONFIG_KEY}`,
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { value, reason: (body as any)?.reason || null },
      created_at: new Date(),
    });
    return value;
  }

  /** P6.x-13: per-app force-update versions + maintenance flags (audited). */
  @Get('app-versions')
  @Roles(UserRole.ADMIN)
  async getAppVersions() {
    const doc = await this.conn.collection('system_configs').findOne({ key: 'app_versions' });
    return doc?.value || { apps: {} };
  }

  @Roles(UserRole.ADMIN)
  @Put('app-versions')
  @Roles(UserRole.ADMIN)
  async updateAppVersions(@Body() body: AppVersionsDto, @CurrentUser() admin: any) {
    const allowedApps = ['patient', 'provider', 'driver', 'pharmacy', 'web'];
    const apps: any = {};
    for (const [k, v] of Object.entries(body?.apps || {})) {
      if (!allowedApps.includes(k) || !v || typeof v !== 'object') continue;
      const app: any = {};
      if (typeof (v as any).min_version === 'string') app.min_version = (v as any).min_version.slice(0, 20);
      if (typeof (v as any).latest_version === 'string') app.latest_version = (v as any).latest_version.slice(0, 20);
      if (typeof (v as any).maintenance === 'boolean') app.maintenance = (v as any).maintenance;
      if (typeof (v as any).message_ar === 'string') app.message_ar = (v as any).message_ar.slice(0, 500);
      if (typeof (v as any).message_en === 'string') app.message_en = (v as any).message_en.slice(0, 500);
      apps[k] = app;
    }
    const value = { apps };
    await this.conn.collection('system_configs').updateOne(
      { key: 'app_versions' },
      { $set: { key: 'app_versions', value, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `app_versions_${Date.now()}`,
      action: 'app_versions_update',
      resource_kind: 'system_config',
      resource_id: 'system_config:app_versions',
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { value, reason: (body as any)?.reason || null },
      created_at: new Date(),
    });
    return value;
  }
}
