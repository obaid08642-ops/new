/**
 * Admin Notification Center — full marketing/operations notification engine.
 *
 * Capabilities:
 *  - Immediate broadcasts: all users / role segments / single user
 *  - Campaigns: create, schedule, send-now, cancel
 *  - Deep links: every payload carries { screen, params } the apps route to
 *  - Automatic event-based notifications: already covered by
 *    NotificationsService + PushService @OnEvent hooks (booking/order/lab/...)
 *  - Reminders: appointment reminders (24h before) via cron
 *  - Retargeting: users with stale carts / unpaid orders (48h cooldown)
 *  - Analytics: delivery rate, open rate, CTR per campaign + overall
 *    (PushLog = delivery, PushEngagement = received/opened/clicked)
 */
import {
  Module, Injectable, Controller, Post, Get, Delete, Body, Param, Query,
  UseGuards, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { PushModule, PushService } from '../push/push.module';

// ── Schema ────────────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true, index: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
  /** all | patients | providers | role:<role> | user:<userId> */
  @Prop({ required: true }) segment: string;
  @Prop({ type: Object }) deep_link?: { route: string; params?: Record<string, any> };
  @Prop() scheduled_at?: Date;
  @Prop({ default: 'draft', enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'], index: true }) status: string;
  @Prop({ type: Object, default: {} }) stats: {
    targeted?: number; sent?: number; failed?: number;
  };
  @Prop() sent_at?: Date;
  @Prop() created_by?: string;
  @Prop() last_error?: string;
}
export type CampaignDocument = Campaign & Document;
export const CampaignSchema = SchemaFactory.createForClass(Campaign);

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class AdminNotificationCenterService {
  private readonly logger = new Logger('AdminNotificationCenter');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly push: PushService,
  ) {}

  private get campaigns() { return this.conn.collection('campaigns'); }
  private get users() { return this.conn.collection('users'); }
  private get engagements() { return this.conn.collection('pushengagements'); }
  private get pushLogs() { return this.conn.collection('pushlogs'); }

  // ── Segment resolution ────────────────────────────────────────────

  async resolveSegment(segment: string): Promise<string[]> {
    if (!segment || segment === 'all') {
      const rows = await this.users.find({}, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
      return rows.map((u: any) => u.id).filter(Boolean);
    }
    if (segment === 'patients') return this.usersByRole('patient');
    if (segment === 'providers') {
      const roles = ['provider', 'doctor', 'pharmacy', 'lab', 'radiology', 'nurse', 'driver'];
      const rows = await this.users.find({ role: { $in: roles } }, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
      return rows.map((u: any) => u.id).filter(Boolean);
    }
    if (segment.startsWith('role:')) return this.usersByRole(segment.slice(5));
    if (segment.startsWith('user:')) return [segment.slice(5)];
    throw new BadRequestException(`Unknown segment: ${segment}`);
  }

  private async usersByRole(role: string): Promise<string[]> {
    const rows = await this.users.find({ role }, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
    return rows.map((u: any) => u.id).filter(Boolean);
  }

  async segmentCounts() {
    const roles = await this.users.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).toArray();
    const by_role: Record<string, number> = {};
    let total = 0;
    for (const r of roles) { by_role[r._id || 'unknown'] = r.count; total += r.count; }
    return {
      all: total,
      patients: by_role['patient'] || 0,
      providers: ['provider', 'doctor', 'pharmacy', 'lab', 'radiology', 'nurse', 'driver'].reduce((s, r) => s + (by_role[r] || 0), 0),
      by_role,
    };
  }

  // ── Campaigns ───────────────────────────────────────────────────────

  async createCampaign(adminId: string, body: any) {
    if (!body?.title || !body?.body || !body?.segment) {
      throw new BadRequestException('title, body, segment are required');
    }
    const id = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const scheduled = body.scheduled_at ? new Date(body.scheduled_at) : null;
    const doc = {
      id,
      name: body.name || body.title,
      title: body.title,
      body: body.body,
      segment: body.segment,
      deep_link: body.deep_link || null,
      scheduled_at: scheduled || undefined,
      status: scheduled && scheduled.getTime() > Date.now() ? 'scheduled' : 'draft',
      stats: {},
      created_by: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.campaigns.insertOne(doc);
    return { ok: true, campaign: doc };
  }

  async listCampaigns(page = 1, limit = 20): Promise<any> {
    const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
    const [items, total] = await Promise.all([
      this.campaigns.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
      this.campaigns.countDocuments({}),
    ]);
    return { data: items, total, page, total_pages: Math.ceil(total / Math.min(limit, 100)) };
  }

  async getCampaign(id: string) {
    const c = await this.campaigns.findOne({ id }, { projection: { _id: 0 } });
    if (!c) throw new NotFoundException('Campaign not found');
    const engagement = await this.campaignEngagementStats(id);
    return { ...c, engagement };
  }

  private async campaignEngagementStats(campaignId: string) {
    const rows = await this.engagements.aggregate([
      { $match: { campaign_id: campaignId } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray();
    const by: Record<string, number> = {};
    for (const r of rows) by[r._id] = r.count;
    return { received: by['received'] || 0, opened: by['opened'] || 0, clicked: by['clicked'] || 0 };
  }

  /** Execute a campaign now (or from the scheduler). */
  async sendCampaign(id: string) {
    const c: any = await this.campaigns.findOne({ id });
    if (!c) throw new NotFoundException('Campaign not found');
    if (c.status === 'sent' || c.status === 'sending') return { ok: false, reason: `already_${c.status}` };

    await this.campaigns.updateOne({ id }, { $set: { status: 'sending', updatedAt: new Date() } });
    try {
      const userIds = await this.resolveSegment(c.segment);
      const data: any = { type: 'campaign', campaign_id: id };
      if (c.deep_link?.route) {
        data.screen = c.deep_link.route;
        if (c.deep_link.params) data.params = c.deep_link.params;
      }
      let queued = 0;
      for (const uid of userIds) {
        await this.push.queueNotification(uid, c.title, c.body, data, 'normal');
        queued++;
      }
      await this.campaigns.updateOne({ id }, {
        $set: { status: 'sent', sent_at: new Date(), stats: { targeted: userIds.length, sent: queued, failed: 0 }, updatedAt: new Date() },
      });
      this.logger.log(`Campaign ${id} sent to ${queued} users (segment=${c.segment})`);
      return { ok: true, targeted: userIds.length, queued };
    } catch (e: any) {
      await this.campaigns.updateOne({ id }, { $set: { status: 'failed', last_error: e.message, updatedAt: new Date() } });
      throw e;
    }
  }

  async cancelCampaign(id: string) {
    const r = await this.campaigns.updateOne(
      { id, status: { $in: ['draft', 'scheduled'] } },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
    );
    if (r.matchedCount === 0) throw new BadRequestException('Only draft/scheduled campaigns can be cancelled');
    return { ok: true };
  }

  /** Immediate broadcast (no campaign record needed, but we log one for stats). */
  async broadcast(adminId: string, body: any) {
    const created = await this.createCampaign(adminId, { ...body, name: body.name || `broadcast_${Date.now()}` });
    const id = created.campaign.id;
    return this.sendCampaign(id);
  }

  // ── Scheduler: due scheduled campaigns every minute ─────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledCampaigns() {
    const due = await this.campaigns.find({
      status: 'scheduled',
      scheduled_at: { $lte: new Date() },
    }).limit(10).toArray();
    for (const c of due) {
      await this.sendCampaign(c.id).catch((e) => this.logger.error(`Scheduled campaign ${c.id} failed: ${e.message}`));
    }
  }

  // ── Reminders: appointments 24h ahead ───────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async appointmentReminders() {
    const now = Date.now();
    const in24h = new Date(now + 24 * 3600 * 1000);
    const in23h = new Date(now + 23 * 3600 * 1000);
    // EPIC4/S20 fix: the appointments schema uses `slot_start` (not
    // `scheduled_time`) and states PENDING/CONFIRMED (no 'SCHEDULED') — the
    // old query matched nothing, so reminders never fired.
    const appts = await this.conn.collection('appointments').find({
      slot_start: { $gte: in23h, $lt: in24h },
      status: { $in: ['PENDING', 'CONFIRMED'] },
      reminder_24h_sent: { $ne: true },
    }).limit(500).toArray();
    for (const a of appts) {
      const pid = (a as any).patient_id || (a as any).patient_account_id;
      if (!pid) continue;
      // Resolve the real doctor name (appointments store doctor_id, not a name)
      let doctorName = '';
      if ((a as any).doctor_id) {
        const prov: any = await this.conn.collection('provider_profiles').findOne(
          { $or: [{ id: (a as any).doctor_id }, { user_id: (a as any).doctor_user_id }] } as any,
          { projection: { name: 1, name_ar: 1 } },
        );
        doctorName = prov?.name_ar || prov?.name || '';
      }
      await this.push.queueNotification(
        pid,
        'تذكير بموعدك',
        `لديك موعد غداً ${doctorName ? `مع ${doctorName}` : ''}. لا تنسَ الحضور.`,
        { type: 'reminder', screen: '/consultations/appointments', appointment_id: (a as any).id },
        'normal',
      );
      await this.conn.collection('appointments').updateOne({ _id: a._id }, { $set: { reminder_24h_sent: true } });
    }
    if (appts.length) this.logger.log(`Sent ${appts.length} appointment reminders`);
  }

  // ── Retargeting: stale carts / unpaid orders (48h cooldown) ─────────

  @Cron(CronExpression.EVERY_6_HOURS)
  async retargetIncompleteOrders() {
    const cooldown = new Date(Date.now() - 48 * 3600 * 1000);
    const staleSince = new Date(Date.now() - 24 * 3600 * 1000);

    // 1) Carts untouched for 24h+
    const carts = await this.conn.collection('carts').find({
      updatedAt: { $lt: staleSince },
      $or: [{ retargeted_at: null }, { retargeted_at: { $lt: cooldown } }],
    }).limit(300).toArray();
    let sent = 0;
    for (const cart of carts) {
      const uid = (cart as any).user_id || (cart as any).patient_id;
      if (!uid) continue;
      await this.push.queueNotification(
        uid,
        'سلتك بانتظارك 🛒',
        'لديك أدوية في السلة لم تكمل طلبها — أكمل الطلب الآن ويصلك بسرعة.',
        { type: 'retarget', screen: '/pharmacy/cart', campaign_id: 'auto_retarget_cart' },
        'normal',
      );
      await this.conn.collection('carts').updateOne({ _id: cart._id }, { $set: { retargeted_at: new Date() } });
      sent++;
    }

    // 2) Orders created but never paid (24h+ old)
    const unpaid = await this.conn.collection('orders').find({
      status: { $in: ['PENDING_PAYMENT', 'CREATED', 'PENDING'] },
      createdAt: { $lt: staleSince },
      $or: [{ retargeted_at: null }, { retargeted_at: { $lt: cooldown } }],
    }).limit(300).toArray();
    for (const o of unpaid) {
      const uid = (o as any).patient_id || (o as any).user_id;
      if (!uid) continue;
      await this.push.queueNotification(
        uid,
        'طلبك غير مكتمل',
        'طلبك لم يكتمل — اضغط هنا لإتمام الدفع والتوصيل.',
        { type: 'retarget', screen: '/pharmacy/order-tracking', params: { orderId: (o as any).id }, campaign_id: 'auto_retarget_order' },
        'normal',
      );
      await this.conn.collection('orders').updateOne({ _id: o._id }, { $set: { retargeted_at: new Date() } });
      sent++;
    }
    if (sent) this.logger.log(`Retargeting: ${sent} reminders queued`);
  }

  // ── Analytics ───────────────────────────────────────────────────────

  async overviewStats() {
    // Delivery from push logs (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const delivery = await this.pushLogs.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, sent: { $sum: '$sent_count' }, failed: { $sum: '$failed_count' }, notifications: { $sum: 1 } } },
    ]).toArray();
    const d = delivery[0] || { sent: 0, failed: 0, notifications: 0 };

    const engagement = await this.engagements.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray();
    const ev: Record<string, number> = {};
    for (const r of engagement) ev[r._id] = r.count;

    const delivered = d.sent || 0;
    const opened = ev['opened'] || 0;
    const clicked = ev['clicked'] || 0;
    return {
      window_days: 30,
      notifications_created: d.notifications,
      delivered,
      failed: d.failed || 0,
      delivery_rate: delivered + d.failed > 0 ? +(delivered / (delivered + d.failed) * 100).toFixed(1) : null,
      opened,
      clicked,
      open_rate: delivered > 0 ? +(opened / delivered * 100).toFixed(1) : null,
      ctr: opened > 0 ? +(clicked / opened * 100).toFixed(1) : null,
    };
  }
}

// ── Controller ────────────────────────────────────────────────────────

@Controller('admin/notification-center')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminNotificationCenterController {
  constructor(private readonly svc: AdminNotificationCenterService) {}

  /** Available segments + audience sizes */
  @Get('segments')
  segments() { return this.svc.segmentCounts(); }

  /** Overall analytics: delivery/open/CTR (30 days) */
  @Get('stats/overview')
  statsOverview() { return this.svc.overviewStats(); }

  /** Immediate broadcast to a segment */
  @Post('broadcasts')
  broadcast(@Body() body: any) { return this.svc.broadcast('admin', body); }

  /** Create campaign (draft or scheduled when scheduled_at provided) */
  @Post('campaigns')
  createCampaign(@Body() body: any) { return this.svc.createCampaign('admin', body); }

  /** List campaigns (paginated) */
  @Get('campaigns')
  listCampaigns(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listCampaigns(parseInt(page || '1'), parseInt(limit || '20'));
  }

  /** Campaign detail + engagement stats */
  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) { return this.svc.getCampaign(id); }

  /** Send a draft/scheduled campaign immediately */
  @Post('campaigns/:id/send')
  sendCampaign(@Param('id') id: string) { return this.svc.sendCampaign(id); }

  /** Cancel a draft/scheduled campaign */
  @Delete('campaigns/:id')
  cancelCampaign(@Param('id') id: string) { return this.svc.cancelCampaign(id); }

  /** Manual retargeting run (also runs automatically every 6h) */
  @Post('retarget/run')
  retarget() { return this.svc.retargetIncompleteOrders(); }
}

// ── Module ────────────────────────────────────────────────────────────

@Module({
  imports: [PushModule],
  controllers: [AdminNotificationCenterController],
  providers: [AdminNotificationCenterService],
  exports: [AdminNotificationCenterService],
})
export class AdminNotificationCenterModule {}
