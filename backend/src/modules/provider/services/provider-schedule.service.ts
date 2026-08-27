import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderRequest, ProviderRequestStatus } from '../schemas/requests.schema';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { isProviderRole } from '../../../common/enums';

function assertProvider(user: any) {
  if (!user || !isProviderRole(user.role)) throw new ForbiddenException('provider scope required');
  return user;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

@Injectable()
export class ProviderScheduleService {
  constructor(@Inject('ProviderRequestRepository') private requests: ProviderRequestRepository) {}

  /**
   * Returns a schedule view derived from accepted/in_progress/completed requests with scheduled_at.
   * Range modes: daily (1 day) | weekly (7 days starting from `from`)
   */
  async view(user: any, q: { mode?: string; from?: string }) {
    assertProvider(user);
    const mode = q.mode === 'weekly' ? 'weekly' : 'daily';
    const baseDate = q.from ? new Date(q.from) : new Date();
    const start = startOfDay(baseDate);
    const end = mode === 'weekly'
      ? endOfDay(new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000))
      : endOfDay(baseDate);

    const items = await this.requests.find({
      provider_account_id: user.id,
      status: { $in: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.IN_PROGRESS, ProviderRequestStatus.COMPLETED] },
      scheduled_at: { $gte: start, $lte: end },
    }).sort({ scheduled_at: 1 }).lean();

    // Group by day (YYYY-MM-DD)
    const days: Record<string, any[]> = {};
    for (const r of items) {
      if (!r.scheduled_at) continue;
      const key = new Date(r.scheduled_at).toISOString().slice(0, 10);
      if (!days[key]) days[key] = [];
      days[key].push({
        id: r.id,
        type: r.type,
        status: r.status,
        scheduled_at: r.scheduled_at,
        scheduled_slot_minutes: r.scheduled_slot_minutes || 30,
        patient_name: r.patient?.name,
        summary_ar: r.summary_ar,
        summary_en: r.summary_en,
      });
    }

    return {
      mode,
      from: start,
      to: end,
      count: items.length,
      days,
    };
  }
}
