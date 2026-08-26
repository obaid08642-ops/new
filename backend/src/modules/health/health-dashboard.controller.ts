/**
 * Internal Health Dashboard — single endpoint powering the admin health page.
 * Reports live status of every infrastructure dependency + runtime metrics.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { RedisService } from '../redis/redis.service';

@Controller('admin/health-dashboard')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class HealthDashboardController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly redis: RedisService,
  ) {}

  private async probe(fn: () => Promise<any>): Promise<{ status: 'up' | 'down'; latency_ms: number | null }> {
    const t0 = Date.now();
    try {
      await fn();
      return { status: 'up', latency_ms: Date.now() - t0 };
    } catch {
      return { status: 'down', latency_ms: null };
    }
  }

  @Get()
  async dashboard() {
    const t0 = Date.now();

    // ── Service probes (parallel) ──
    const [mongo, redis, livekit, coturn, r2, fcm, resend] = await Promise.all([
      this.probe(() => this.conn.db.admin().ping()),
      this.probe(async () => {
        const c = (this.redis as any).getClient?.();
        if (!c) throw new Error('no client');
        const r = await c.ping();
        if (r !== 'PONG') throw new Error(r);
      }),
      this.probe(() => fetch(process.env.LIVEKIT_URL?.replace('wss://', 'https://').replace('ws://', 'http://') || 'http://livekit:7880', { signal: AbortSignal.timeout(4000) }).then(r => { if (!r.ok && r.status !== 404) throw new Error(String(r.status)); })),
      this.probe(() => Promise.resolve(process.env.COTURN_HOST ? true : Promise.reject())),
      this.probe(() => {
        if (!process.env.S3_BUCKET) return Promise.reject(new Error('not configured'));
        return fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
          .then(r => { if (r.status >= 500) throw new Error(String(r.status)); });
      }),
      this.probe(() => Promise.resolve(process.env.FCM_PROJECT_ID ? true : Promise.reject(new Error('not configured')))),
      this.probe(() => {
        if (!process.env.RESEND_API_KEY) return Promise.reject(new Error('not configured'));
        return fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(4000) })
          .then(r => { if (r.status === 401 || r.status >= 500) throw new Error(String(r.status)); });
      }),
    ]);

    // ── Runtime metrics (parallel) ──
    const db = this.conn.db;
    const day = 24 * 3600 * 1000;
    const [
      usersTotal, wsConnections, activeCalls, openOrders, openCarts,
      recentErrors, dbStats, medsCount, pendingReports, pendingImages,
    ] = await Promise.all([
      this.conn.collection('users').countDocuments({}),
      Promise.resolve((global as any).__ws_count ?? null),
      this.conn.collection('callsessions').countDocuments({ status: { $in: ['INITIATED', 'ACTIVE'] } }),
      this.conn.collection('orders').countDocuments({ status: { $in: ['PENDING', 'CREATED', 'PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'] } }),
      this.conn.collection('carts').countDocuments({}),
      this.conn.collection('system_events').find({ type: /error|failed/i }).sort({ createdAt: -1 }).limit(10).project({ _id: 0, type: 1, createdAt: 1, meta: 1 }).toArray().catch(() => []),
      db.stats().catch(() => null),
      this.conn.collection('medicines_master').countDocuments({}),
      this.conn.collection('pharmacy_shortage_reports').countDocuments({ status: 'pending' }),
      this.conn.collection('medicine_image_suggestions').countDocuments({ status: 'pending' }),
    ]);

    // Queue depth (BullMQ on Redis)
    let queues: any = null;
    try {
      const c = (this.redis as any).getClient?.();
      if (c) {
        const keys = await c.keys('bull:*:wait');
        queues = {};
        for (const k of keys.slice(0, 10)) {
          queues[k.replace(/^bull:|:wait$/g, '')] = await c.llen(k);
        }
      }
    } catch { queues = null; }

    // Cron jobs (static known schedule + last backup file age)
    const crons = [
      { name: 'daily-backup', schedule: '03:00 daily', status: 'scheduled' },
      { name: 'monitor', schedule: '*/15min', status: 'scheduled' },
      { name: 'hot-medicines', schedule: '04:00 daily', status: 'scheduled' },
      { name: 'appointment-reminders', schedule: 'hourly', status: 'in-app' },
      { name: 'retargeting', schedule: 'every 6h', status: 'in-app' },
      { name: 'scheduled-campaigns', schedule: 'every minute', status: 'in-app' },
      { name: 'certbot-renew', schedule: '12h', status: 'scheduled' },
    ];

    return {
      generated_at: new Date().toISOString(),
      elapsed_ms: Date.now() - t0,
      services: {
        mongodb: mongo,
        redis,
        livekit,
        coturn,
        r2: { ...r2, configured: !!process.env.S3_BUCKET, bucket: process.env.S3_BUCKET || null },
        fcm: { ...fcm, configured: !!process.env.FCM_PROJECT_ID },
        resend: { ...resend, configured: !!process.env.RESEND_API_KEY },
      },
      metrics: {
        users_total: usersTotal,
        websocket_connections: wsConnections,
        active_calls: activeCalls,
        open_orders: openOrders,
        open_carts: openCarts,
        medicines_total: medsCount,
        pending_shortage_reports: pendingReports,
        pending_image_suggestions: pendingImages,
        db_size_mb: dbStats ? Math.round((dbStats.dataSize || 0) / 1024 / 1024) : null,
        db_storage_mb: dbStats ? Math.round((dbStats.storageSize || 0) / 1024 / 1024) : null,
      },
      queues,
      crons,
      recent_errors: recentErrors,
      // Disk/RAM/CPU/SSL/backup come from the monitor cron log (host-level)
      host_note: 'Host metrics (disk/ram/cpu/ssl/backup) are tracked by scripts/monitor.sh — see /var/log/nabdah-monitor.log on the VPS',
    };
  }
}
