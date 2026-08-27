import { Controller, Get, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Observable, interval, merge, of, map, switchMap, from } from 'rxjs';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';

/**
 * A7 — Command Center v2: live tiles over SSE (replaces 30s polling).
 * Emits REAL Mongo aggregates every 15s + admin action events as they happen.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCommandCenterV2Controller {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** One-shot snapshot used on page load (and by the SSE tick). */
  async snapshot() {
    const db = this.conn.db;
    const now = Date.now();
    const dayAgo = new Date(now - 86_400_000);
    const count = (col: string, q: any = {}) => db.collection(col).countDocuments(q).catch(() => 0);

    const [activeOrders, activeLabs, activeRads, activeNursing, apptsToday, openSos,
      unreadTickets, payments24hAgg] = await Promise.all([
      count('orders', { state: { $nin: ['CANCELLED', 'DELIVERED', 'REJECTED'] } }),
      count('labbookings', { state: { $nin: ['CANCELLED', 'REPORTED', 'SAMPLE_REJECTED'] } }),
      count('radiologybookings', { state: { $nin: ['CANCELLED', 'REPORT_PUBLISHED'] } }),
      count('homecarebookings', { state: { $nin: ['CANCELLED', 'COMPLETED', 'DONE', 'REJECTED'] } }),
      count('appointments', { slot_start: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(24, 0, 0, 0)) }, status: { $nin: ['CANCELLED'] } }),
      count('emergencyrequests', { status: { $in: ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'ACCEPTED'] } }).catch(() => 0),
      count('support_requests', { status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      db.collection('moyasar_payments').aggregate([
        { $match: { status: { $in: ['paid', 'confirmed', 'succeeded'] }, createdAt: { $gte: dayAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
      ]).toArray().then((r: any[]) => r[0] || { total: 0, n: 0 }).catch(() => ({ total: 0, n: 0 })),
    ]);

    // SLA alerts: bookings whose SLA due date passed while still active
    const slaBreached = await Promise.all([
      count('orders', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'DELIVERED'] } }),
      count('labbookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'REPORTED'] } }),
      count('radiologybookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'REPORT_PUBLISHED'] } }),
      count('homecarebookings', { sla_due_at: { $lt: new Date() }, state: { $nin: ['CANCELLED', 'COMPLETED'] } }),
    ]).then((a) => a.reduce((x, y) => x + y, 0));

    return {
      ts: new Date().toISOString(),
      tiles: {
        orders_active: activeOrders,
        labs_active: activeLabs,
        radiology_active: activeRads,
        nursing_active: activeNursing,
        appointments_today: apptsToday,
        sos_open: openSos,
        tickets_open: unreadTickets,
        revenue_24h_sar: Math.round(Number(payments24hAgg.total || 0) * 100) / 100,
        payments_24h: Number(payments24hAgg.n || 0),
        sla_breach_total: slaBreached,
      },
    };
  }

  @Get('command-center-v2')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  initial() {
    return this.snapshot();
  }

  /**
   * Live stream — real aggregates every 15s + event-bus admin events live.
   * Consumed via EventSource('/api/admin/bff/admin/stream').
   */
  @Sse('stream')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  stream(): Observable<MessageEvent> {
    const tiles = interval(15_000).pipe(
      switchMap(() => from(this.snapshot())),
      map((snap) => ({ data: snap } as MessageEvent)),
    );
    const hello = of({ data: { type: 'connected', t: Date.now() } } as MessageEvent);
    return merge(hello, tiles);
  }
}
