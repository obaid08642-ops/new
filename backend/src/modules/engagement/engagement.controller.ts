import { Body, Controller, Logger, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { ShedOnOverload } from '../../common/load-shedding.guard';
import { connectionFlagSource, isKilled } from '../../common/killswitches/killswitches.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/enums';

/**
 * N10: Behaviour-triggered nudges.
 *
 * When a user views or searches for something and leaves without ordering,
 * send a relevant notification after a delay the admin sets.
 *
 * The engine skips the nudge if:
 * - the user has since ordered or booked that kind
 * - the user opted out
 * - it is quiet hours
 * - the user already had a nudge for this kind within the cooldown
 */

const INTEREST_KINDS = [
  'medicine', 'category', 'doctor', 'specialty', 'lab_test',
  'radiology', 'nursing', 'pregnancy', 'ovulation', 'family',
  'mental_health', 'nutrition', 'search_query',
] as const;

class EngagementEventDto {
  kind: string;
  ref_id?: string;
  query?: string;
  locale: string;
}

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  private readonly logger = new Logger(EngagementController.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectQueue('engagement-nudges') private readonly queue: Queue,
    private readonly notifications: NotificationsService,
  ) {}

  @Post('events')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ShedOnOverload() // 14.17: nudges/analytics events shed first
  @ShedOnOverload() // 14.17: nudges/analytics events shed first
  async trackEvent(@CurrentUser() user: any, @Body() body: EngagementEventDto) {
    if (!body?.kind || !INTEREST_KINDS.includes(body.kind as any)) {
      throw new BadRequestException('invalid_kind');
    }
    if (!body.locale) throw new BadRequestException('locale_required');

    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: user.id,
      kind: body.kind,
      ref_id: body.ref_id || null,
      query: body.query || null,
      locale: body.locale,
      created_at: new Date(),
    };

    await this.conn.collection('user_interest_events').insertOne(event);

    // Kill switch: the interest event above is still recorded (analytics),
    // but nothing is enqueued and nothing is sent.
    if (await isKilled('nudges', connectionFlagSource(this.conn))) {
      this.logger.debug(`nudges killed \u2014 dropped enqueue for event ${event.id}`);
      return { ok: true, event_id: event.id, nudges_killed: true };
    }

    // Get the admin-configured delay for this kind
    const rule = await this.conn.collection('engagement_nudge_rules').findOne({ kind: body.kind });
    const delayMinutes = rule?.delay_minutes || 5;

    // Schedule the nudge job
    await this.queue.add('nudge', { eventId: event.id }, {
      delay: delayMinutes * 60 * 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 100,
    });

    return { ok: true, event_id: event.id };
  }
}

/**
 * Nudge processor — runs when the delayed job fires.
 * Skips the nudge if any suppression condition holds.
 */
export async function processNudge(
  conn: Connection,
  notifications: NotificationsService,
  eventId: string,
) {
  // Kill switch also stops already-queued jobs from sending; dropped silently.
  if (await isKilled('nudges', connectionFlagSource(conn))) return;
  const event = await conn.collection('user_interest_events').findOne({ id: eventId });
  if (!event) return;

  const userId = event.user_id;
  const kind = event.kind;

  // 1. User has since ordered or booked that kind → skip
  const recentOrder = await conn.collection('orders').findOne({
    patient_id: userId,
    created_at: { $gte: event.created_at },
  });
  if (recentOrder) return;

  // 2. User opted out → skip
  const settings = await conn.collection('users').findOne({ id: userId }, { projection: { notification_settings: 1 } });
  if (settings?.notification_settings?.categories?.suggestions === false) return;

  // 3. Quiet hours → skip (unless transactional)
  const now = new Date();
  const hour = now.getHours();
  if (settings?.notification_settings?.quiet_hours) {
    const { start, end } = settings.notification_settings.quiet_hours;
    if (hour >= start && hour < end) return;
  }

  // 4. Cooldown: already had a nudge for this kind within 24h → skip
  const recentNudge = await conn.collection('user_interest_events').findOne({
    user_id: userId,
    kind,
    created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    _id: { $ne: event._id },
  });
  if (recentNudge) return;

  // Send the nudge
  const rule = await conn.collection('engagement_nudge_rules').findOne({ kind });
  const title = rule?.title?.[event.locale] || rule?.title?.ar || 'قد يهمك';
  const body = rule?.body?.[event.locale] || rule?.body?.ar || '';

  await notifications.create({
    user_id: userId,
    title_key: title,
    body_key: body,
    type: NotificationType.INFO,
    action: nudgeRoute(kind, event.ref_id),
  });
}

/**
 * 416: the route a nudge opens, one the apps know (patient-app translateBackendRoute): the item itself when it has a page
 * (a medicine, a doctor, a lab test), otherwise the service's hub.
 */
export function nudgeRoute(kind: string, refId?: string | null): { route: string } {
  const ref = typeof refId === 'string' && refId ? encodeURIComponent(refId) : '';
  if (ref && kind === 'medicine') return { route: `/pharmacy/product/${ref}` };
  if (ref && kind === 'doctor') return { route: `/doctors/${ref}` };
  if (ref && kind === 'lab_test') return { route: `/labs/tests/${ref}` };
  const hubs: Record<string, string> = {
    medicine: '/pharmacy', category: '/pharmacy', search_query: '/pharmacy', doctor: '/consultations', specialty: '/consultations',
    lab_test: '/diagnostics', radiology: '/diagnostics', nursing: '/nursing', pregnancy: '/maternity', ovulation: '/maternity',
    family: '/family', mental_health: '/mental-health', nutrition: '/nutrition',
  };
  return { route: hubs[kind] || '/notifications' };
}
