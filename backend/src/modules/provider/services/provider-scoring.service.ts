import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderScoreSnapshot, ProviderAssignmentAttempt, AssignmentAttemptStatus } from '../schemas/capabilities.schema';
import { ProviderRequest, ProviderRequestStatus } from '../schemas/requests.schema';
import { ProviderScoreSnapshotRepository } from "./repositories/providerscoresnapshot.repository";
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAssignmentAttemptRepository } from "./repositories/providerassignmentattempt.repository";

function assertProvider(user: any) {
  if (!user || user.role !== 'provider') throw new ForbiddenException('provider scope required');
  return user;
}

@Injectable()
export class ProviderScoringService {
  constructor(
    @Inject('ProviderScoreSnapshotRepository') private scores: ProviderScoreSnapshotRepository,
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    @Inject('ProviderAssignmentAttemptRepository') private attempts: ProviderAssignmentAttemptRepository,
  ) {}

  /**
   * Recompute the score snapshot for a provider based on all-time stats.
   * Light version: based on direct request statuses + (if any) assignment attempt response times.
   */
  async recompute(provider_account_id: string) {
    const base = { provider_account_id };
    const [total, accepted, rejected, completed, cancelled, atts] = await Promise.all([
      this.requests.countDocuments(base),
      this.requests.countDocuments({ ...base, status: { $in: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.IN_PROGRESS, ProviderRequestStatus.COMPLETED] } }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.REJECTED }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.COMPLETED }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.CANCELLED }),
      this.attempts.find({ ...base, responded_at: { $exists: true } }, { sent_at: 1, responded_at: 1, status: 1 }).lean(),
    ]);

    const decided = accepted + rejected;
    const acceptance_rate = decided > 0 ? accepted / decided : 0;
    const completion_rate = accepted > 0 ? completed / accepted : 0;

    let totalResponseMs = 0; let respCount = 0;
    for (const a of atts as any[]) {
      if (a.responded_at && a.sent_at) {
        totalResponseMs += new Date(a.responded_at).getTime() - new Date(a.sent_at).getTime();
        respCount++;
      }
    }
    const avg_response_seconds = respCount > 0 ? Math.round(totalResponseMs / respCount / 1000) : 0;

    // Composite reliability score (0..100): 50% acceptance + 30% completion + 20% response speed bonus
    const responseBonus = avg_response_seconds === 0 ? 0 : Math.max(0, 1 - Math.min(avg_response_seconds, 600) / 600);
    const reliability_score = Math.round(
      acceptance_rate * 50 + completion_rate * 30 + responseBonus * 20,
    );

    const upd = await this.scores.findOneAndUpdate(
      { provider_account_id },
      {
        provider_account_id,
        total_requests: total,
        total_accepted: accepted,
        total_rejected: rejected,
        total_completed: completed,
        total_cancelled: cancelled,
        acceptance_rate,
        completion_rate,
        avg_response_seconds,
        reliability_score,
        last_calculated_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return upd.toObject();
  }

  async getMy(user: any) {
    assertProvider(user);
    let s = await this.scores.findOne({ provider_account_id: user.id }).lean();
    if (!s) s = (await this.recompute(user.id)) as any;
    return s;
  }

  /** Batch lookup for matching engine. */
  async getForIds(ids: string[]): Promise<Record<string, any>> {
    const found = await this.scores.find({ provider_account_id: { $in: ids } }).lean();
    const map: Record<string, any> = {};
    for (const s of found as any[]) map[s.provider_account_id] = s;
    return map;
  }

  /** Recompute on lifecycle change — called from request engine after transitions. */
  async onLifecycleEvent(provider_account_id: string) {
    // Fire-and-forget style — errors swallowed to not block transitions.
    try { await this.recompute(provider_account_id); } catch { /* noop */ }
  }

  /** Mark assignment attempt response time. */
  async markAttemptResponse(request_id: string, provider_account_id: string, status: AssignmentAttemptStatus, reason?: string) {
    const a = await this.attempts.findOne({ request_id, provider_account_id, status: AssignmentAttemptStatus.PENDING }).sort({ createdAt: -1 });
    if (!a) return;
    a.status = status;
    a.responded_at = new Date();
    if (reason) a.rejection_reason = reason;
    await a.save();
  }
}
