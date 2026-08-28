import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderRequest, ProviderRequestStatus, ProviderRequestType } from '../schemas/requests.schema';
import {
  ProviderAssignmentAttempt, AssignmentAttemptStatus, AssignmentStrategy,
} from '../schemas/capabilities.schema';
import { ProviderMatchingService } from './provider-matching.service';
import { ProviderNotificationsService } from './provider-notifications.service';
import { ProviderScoringService } from './provider-scoring.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAssignmentAttemptRepository } from "./repositories/providerassignmentattempt.repository";
import { isProviderRole } from '../../../common/enums';

function assertProvider(user: any) {
  if (!user || !isProviderRole(user.role)) throw new ForbiddenException('provider scope required');
  return user;
}

function assertAdmin(user: any) {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) throw new ForbiddenException('admin only');
  return user;
}

@Injectable()
export class AssignmentStrategyService {
  private logger = new Logger('AssignmentStrategy');

  constructor(
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    @Inject('ProviderAssignmentAttemptRepository') private attempts: ProviderAssignmentAttemptRepository,
    private readonly matching: ProviderMatchingService,
    private readonly notifs: ProviderNotificationsService,
    private readonly scoring: ProviderScoringService,
  ) {}

  /**
   * Create a NEW unassigned request, then immediately apply assignment strategy.
   */
  async createAndDispatch(input: {
    type: ProviderRequestType;
    patient: any;
    payload: any;
    summary_ar?: string;
    summary_en?: string;
    amount_total?: number;
    priority?: any;
    scheduled_at?: Date;
    patient_location?: { lat: number; lng: number; address?: string };
    strategy?: AssignmentStrategy;
    timeout_seconds?: number;
    seeded?: boolean;
  }) {
    const strategy = input.strategy || AssignmentStrategy.AUTO_BEST;
    const r = await this.requests.create({
      provider_account_id: null,
      type: input.type,
      status: ProviderRequestStatus.PENDING,
      patient: input.patient,
      payload: input.payload,
      summary_ar: input.summary_ar,
      summary_en: input.summary_en,
      amount_total: input.amount_total || 0,
      priority: input.priority,
      scheduled_at: input.scheduled_at,
      patient_location: input.patient_location,
      assignment_state: 'matching',
      assignment_strategy: strategy,
      attempted_provider_ids: [],
      seeded: !!input.seeded,
      timeline: [{ at: new Date(), status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: 'request created — dispatching' }],
    });
    const dispatch = await this.dispatch(r.id, input.timeout_seconds || 120);
    return { request: (await this.requests.findOne({ id: r.id }).lean()), dispatch };
  }

  /**
   * Apply strategy on a request: rank, attempt top-N.
   */
  async dispatch(request_id: string, timeout_seconds = 120) {
    const r = await this.requests.findOne({ id: request_id });
    if (!r) throw new NotFoundException('request not found');
    if (r.assignment_state === 'assigned') return { ok: false, reason: 'already_assigned', request_id };

    const match = await this.matching.matchForRequest(request_id, 10);
    r.match_breakdown = { ranked_at: new Date(), candidates: match.candidates };

    if (match.candidates.length === 0) {
      r.assignment_state = 'failed';
      r.status = ProviderRequestStatus.CANCELLED;
      r.cancelled_at = new Date();
      r.rejection_reason = 'no_eligible_providers';
      r.timeline.push({ at: new Date(), status: ProviderRequestStatus.CANCELLED, by_role: 'system', by_user_id: 'system', note: 'no eligible providers' });
      await r.save();
      return { ok: false, reason: 'no_eligible_providers', request_id };
    }

    const strategy = r.assignment_strategy;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeout_seconds * 1000);

    if (strategy === AssignmentStrategy.AUTO_BEST || strategy === AssignmentStrategy.MANUAL) {
      const top = match.candidates[0];
      // For AUTO_BEST: directly assign to top candidate as pending
      r.provider_account_id = top.provider_account_id;
      r.assignment_state = 'assigned';
      r.attempted_provider_ids = [...(r.attempted_provider_ids || []), top.provider_account_id];
      r.assignment_timeout_at = expiresAt;
      r.timeline.push({ at: now, status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: `auto-assigned to ${top.display_name}` });
      await r.save();
      await this.attempts.create({
        request_id: r.id, provider_account_id: top.provider_account_id, attempt_index: 1,
        strategy, sent_at: now, expires_at: expiresAt, timeout_seconds, score: top.breakdown,
        status: AssignmentAttemptStatus.PENDING,
      });
      await this.notifs.createSystem(top.provider_account_id, {
        type: 'new_request' as any,
        title_ar: 'طلب جديد تم توجيهه إليك', title_en: 'New request assigned to you',
        body_ar: r.summary_ar, body_en: r.summary_en,
        related_id: r.id, related_type: 'request', icon: 'bell',
      });
      return { ok: true, strategy, assigned_to: top.provider_account_id, expires_at: expiresAt, candidates: match.candidates };
    }

    if (strategy === AssignmentStrategy.BROADCAST) {
      const top3 = match.candidates.slice(0, 3);
      r.assignment_state = 'broadcasted';
      r.assignment_timeout_at = expiresAt;
      r.attempted_provider_ids = [...(r.attempted_provider_ids || []), ...top3.map((c) => c.provider_account_id)];
      r.timeline.push({ at: now, status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'system', note: `broadcasted to ${top3.length} providers` });
      await r.save();
      for (let i = 0; i < top3.length; i++) {
        const c = top3[i];
        await this.attempts.create({
          request_id: r.id, provider_account_id: c.provider_account_id, attempt_index: i + 1,
          strategy, sent_at: now, expires_at: expiresAt, timeout_seconds, score: c.breakdown,
          status: AssignmentAttemptStatus.PENDING,
        });
        await this.notifs.createSystem(c.provider_account_id, {
          type: 'new_request' as any,
          title_ar: 'فرصة طلب جديد — أول من يقبل',
          title_en: 'New request available — first to accept',
          body_ar: r.summary_ar, body_en: r.summary_en,
          related_id: r.id, related_type: 'request', icon: 'bell',
        });
      }
      return { ok: true, strategy, broadcasted_to: top3.map(c => c.provider_account_id), expires_at: expiresAt, candidates: match.candidates };
    }

    return { ok: false, reason: 'unknown_strategy' };
  }

  /**
   * Manual admin assignment (admin chooses a provider).
   */
  async manualAssign(user: any, request_id: string, provider_account_id: string) {
    assertAdmin(user);
    const r = await this.requests.findOne({ id: request_id });
    if (!r) throw new NotFoundException('request not found');
    if (r.assignment_state === 'assigned' && r.status !== ProviderRequestStatus.PENDING) {
      throw new BadRequestException('request already in active assignment');
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 120 * 1000);
    r.provider_account_id = provider_account_id;
    r.assignment_state = 'assigned';
    r.assignment_strategy = AssignmentStrategy.MANUAL;
    r.assignment_timeout_at = expiresAt;
    r.attempted_provider_ids = Array.from(new Set([...(r.attempted_provider_ids || []), provider_account_id]));
    r.timeline.push({ at: now, status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: user.id, note: `manual assignment by admin` });
    await r.save();
    await this.attempts.create({
      request_id: r.id, provider_account_id, attempt_index: (r.attempted_provider_ids?.length || 1),
      strategy: AssignmentStrategy.MANUAL, sent_at: now, expires_at: expiresAt, timeout_seconds: 120,
      status: AssignmentAttemptStatus.PENDING,
    });
    await this.notifs.createSystem(provider_account_id, {
      type: 'new_request' as any,
      title_ar: 'تعيين إداري — طلب جديد',
      title_en: 'Admin assignment — new request',
      body_ar: r.summary_ar, body_en: r.summary_en,
      related_id: r.id, related_type: 'request', icon: 'bell',
    });
    return r.toObject();
  }

  /**
   * Called when a provider rejects the request. Re-routes to next best candidate.
   */
  async onProviderRejected(request_id: string, provider_account_id: string, reason?: string) {
    const r = await this.requests.findOne({ id: request_id });
    if (!r) return;
    await this.scoring.markAttemptResponse(request_id, provider_account_id, AssignmentAttemptStatus.REJECTED, reason);
    // Re-dispatch if was auto/broadcast (not for manual)
    if (r.assignment_strategy === AssignmentStrategy.MANUAL) return;
    if (r.attempted_provider_ids && r.attempted_provider_ids.length >= 5) {
      r.assignment_state = 'failed';
      r.rejection_reason = 'max_attempts_reached';
      await r.save();
      return;
    }
    // Reset to unassigned and re-dispatch
    r.provider_account_id = null;
    r.assignment_state = 'matching';
    r.status = ProviderRequestStatus.PENDING;
    await r.save();
    await this.dispatch(request_id, 120);
  }

  /** Called on accept — close any sibling pending attempts. */
  async onProviderAccepted(request_id: string, provider_account_id: string) {
    await this.scoring.markAttemptResponse(request_id, provider_account_id, AssignmentAttemptStatus.ACCEPTED);
    // Close other pending attempts for the same request
    await this.attempts.updateMany(
      { request_id, provider_account_id: { $ne: provider_account_id }, status: AssignmentAttemptStatus.PENDING },
      { $set: { status: AssignmentAttemptStatus.CANCELLED, responded_at: new Date() } },
    );
  }

  /**
   * Expire stale assignment attempts (cron-style endpoint).
   * Returns count of expired and rerouted.
   */
  async expireStale() {
    const now = new Date();
    const stale = await this.attempts.find({ status: AssignmentAttemptStatus.PENDING, expires_at: { $lt: now } }).lean();
    let expired = 0; let rerouted = 0;
    for (const a of stale as any[]) {
      await this.attempts.updateOne({ id: a.id }, { $set: { status: AssignmentAttemptStatus.TIMED_OUT, responded_at: now } });
      expired++;
      const r = await this.requests.findOne({ id: a.request_id });
      if (r && r.status === ProviderRequestStatus.PENDING) {
        await this.onProviderRejected(a.request_id, a.provider_account_id, 'timed_out');
        rerouted++;
      }
    }
    return { expired, rerouted, scanned: stale.length };
  }

  async listAttempts(user: any, request_id: string) {
    return this.attempts.find({ request_id }).sort({ attempt_index: 1, createdAt: 1 }).lean();
  }
}
