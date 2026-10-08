import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReleaseVersion, ReleaseVersionDocument } from './schemas/release.schema';
import { ReleaseRollout, ReleaseRolloutDocument } from './schemas/release.schema';
import { AppStoreReview, AppStoreReviewDocument } from './schemas/release.schema';
import { RatingPrompt, RatingPromptDocument } from './schemas/release.schema';

interface CreateReleaseDto {
  version: string;
  app: 'patient-app' | 'provider-app' | 'patient-web' | 'admin';
  channel: 'internal' | 'beta' | 'production';
  build_metadata?: Record<string, any>;
  rollout_percentage?: number[];
}

interface RolloutConfig {
  release_version_id: string;
  percentages: number[];
  crash_free_threshold: number;
  anr_threshold: number;
}

/** Phase 22.13 (P22.1.2): production promotion stability gates. */
export const CRASH_FREE_MIN = 99.5;
export const ANR_MAX = 0.47;
/** C6.1: max reply body length for store reviews. */
export const REVIEW_REPLY_MAX_LENGTH = 1000;

export interface PromoteBetaOpts {
  platform: 'ios' | 'android';
  testflight_build_number?: string;
  testflight_group?: 'internal' | 'external';
  play_track?: 'internal' | 'closed';
  play_rollout_fraction?: number;
  promoted_by?: string;
}

export interface PromoteProductionOpts {
  crash_free_rate?: number;
  anr_rate?: number;
  promoted_by?: string;
}

@Injectable()
export class ReleaseService {
  private readonly logger = new Logger(ReleaseService.name);

  constructor(
    @Inject('ReleaseVersionModel') private readonly versionModel: Model<ReleaseVersionDocument>,
    @Inject('ReleaseRolloutModel') private readonly rolloutModel: Model<ReleaseRolloutDocument>,
    @Inject('AppStoreReviewModel') private readonly reviewModel: Model<AppStoreReviewDocument>,
    @Inject('RatingPromptModel') private readonly promptModel: Model<RatingPromptDocument>,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  /**
   * Create a new release version draft.
   */
  async createRelease(dto: CreateReleaseDto): Promise<ReleaseVersionDocument> {
    const existing = await this.versionModel.findOne({ version: dto.version, app: dto.app }).lean().exec();
    if (existing) throw new BadRequestException('version_already_exists');

    const release = new this.versionModel({
      version: dto.version,
      app: dto.app,
      channel: dto.channel,
      status: 'draft',
      build_metadata: dto.build_metadata,
      rollout_percentage: dto.rollout_percentage || [10, 25, 50, 100],
    });

    await release.save();
    this.logger.log(`Created release ${dto.version} for ${dto.app} (${dto.channel})`);
    return release;
  }

  /**
   * Submit release for review (internal → beta).
   */
  async submitForReview(versionId: string): Promise<ReleaseVersionDocument> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');
    if (release.status !== 'draft') throw new BadRequestException('only_draft_can_be_submitted');

    release.status = 'submitted';
    release.submitted_at = new Date();
    await release.save();
    return release;
  }

  /**
   * Approve release (beta → production rollout).
   */
  async approveRelease(versionId: string): Promise<ReleaseVersionDocument> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');
    if (release.status !== 'submitted' && release.channel !== 'beta') {
      throw new BadRequestException('only_submitted_beta_can_be_approved');
    }

    release.status = 'approved';
    release.approved_at = new Date();
    await release.save();

    // Create initial rollout
    const percentages = release.rollout_percentage || [10, 25, 50, 100];
    const rollout = new this.rolloutModel({
      release_version_id: release.id,
      percentage: percentages[0],
      status: 'started',
      started_at: new Date(),
    });
    await rollout.save();

    release.status = 'rolled_out';
    release.rolled_out_at = new Date();
    await release.save();

    this.logger.log(`Approved release ${release.version} for ${release.app}, started rollout at ${percentages[0]}%`);
    return release;
  }

  /**
   * Advance rollout to next percentage.
   */
  async advanceRollout(releaseVersionId: string, crashFreeRate: number, anrRate: number): Promise<ReleaseRolloutDocument> {
    const release = await this.versionModel.findById(releaseVersionId);
    if (!release) throw new NotFoundException('release_not_found');

    const currentRollout = await this.rolloutModel.findOne({ 
      release_version_id: releaseVersionId, 
      status: 'started' 
    }).sort({ createdAt: -1 }).lean().exec() as any;
    
    if (!currentRollout) throw new BadRequestException('no_active_rollout');

    const percentages = release.rollout_percentage || [10, 25, 50, 100];
    const currentIndex = percentages.indexOf(currentRollout.percentage);
    
    if (currentIndex === -1 || currentIndex >= percentages.length - 1) {
      throw new BadRequestException('rollout_complete_or_invalid');
    }

    // Check crash-free and ANR gates
    if (crashFreeRate < 99.5) {
      throw new BadRequestException(`crash_free_rate_${crashFreeRate}_below_threshold_99.5`);
    }
    if (anrRate > 0.47) {
      throw new BadRequestException(`anr_rate_${anrRate}_above_threshold_0.47`);
    }

    // Complete current rollout
    await this.rolloutModel.findByIdAndUpdate(currentRollout._id, {
      status: 'completed',
      completed_at: new Date(),
      crash_free_rate: crashFreeRate,
      anr_rate: anrRate,
    });

    // Start next rollout
    const nextPercentage = percentages[currentIndex + 1];
    const nextRollout = new this.rolloutModel({
      release_version_id: releaseVersionId,
      percentage: nextPercentage,
      status: 'started',
      started_at: new Date(),
    });
    await nextRollout.save();

    this.logger.log(`Advanced rollout for ${release.version} to ${nextPercentage}%`);
    return nextRollout;
  }

  /**
   * Halt a rollout.
   */
  async haltRollout(releaseVersionId: string, reason: string): Promise<ReleaseRolloutDocument> {
    const rollout = await this.rolloutModel.findOne({ 
      release_version_id: releaseVersionId, 
      status: 'started' 
    }).sort({ createdAt: -1 }).lean().exec() as any;
    
    if (!rollout) throw new NotFoundException('no_active_rollout');

    await this.rolloutModel.findByIdAndUpdate(rollout._id, {
      status: 'halted',
      halted_at: new Date(),
      halt_reason: reason,
    });

    const release = await this.versionModel.findById(releaseVersionId);
    if (release) {
      release.status = 'halted';
      release.halted_at = new Date();
      release.halt_reason = reason;
      await release.save();
    }

    this.logger.warn(`Halted rollout for release ${releaseVersionId}: ${reason}`);
    return rollout;
  }

  /**
   * Record observed stability metrics onto a version (crash-free %, ANR %).
   * These recorded values are what the production gate evaluates.
   */
  async recordVersionHealth(versionId: string, crashFreeRate: number, anrRate: number): Promise<ReleaseVersionDocument> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');
    assertValidHealth(crashFreeRate, anrRate);
    release.crash_free_rate = crashFreeRate;
    release.anr_rate = anrRate;
    await release.save();
    return release;
  }

  /**
   * Promote internal → beta per app.
   *
   * Stores the beta_track (TestFlight build/group for iOS, Play
   * internal/closed track + rollout fraction for Android) and queues the
   * external store upload as `pending_sync`.
   *
   * BLOCKED (infra-owned): the actual uploads —
   *   - App Store Connect: POST beta builds / assign TestFlight groups
   *     (requires ASC API key + issuer; owned by infra, not this module).
   *   - Play Console: promote to internal/closed track via
   *     androidpublisher edits API (requires service-account creds).
   * Until the provider confirms, sync_status stays `pending_sync`.
   * This method never fabricates a provider response.
   */
  async promoteToBeta(versionId: string, opts: PromoteBetaOpts): Promise<ReleaseVersionDocument> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');
    if (release.channel !== 'internal') throw new BadRequestException('only_internal_can_promote_to_beta');

    if (opts.platform === 'ios') {
      if (!opts.testflight_build_number || !opts.testflight_build_number.trim()) {
        throw new BadRequestException('testflight_build_number_required');
      }
    } else if (opts.platform === 'android') {
      if (opts.play_track !== 'internal' && opts.play_track !== 'closed') {
        throw new BadRequestException('play_track_must_be_internal_or_closed');
      }
      if (opts.play_rollout_fraction !== undefined) {
        if (!Number.isFinite(opts.play_rollout_fraction) || opts.play_rollout_fraction <= 0 || opts.play_rollout_fraction > 1) {
          throw new BadRequestException('play_rollout_fraction_must_be_between_0_and_1');
        }
      }
    } else {
      throw new BadRequestException('platform_must_be_ios_or_android');
    }

    const from = release.channel;
    release.channel = 'beta';
    release.beta_track = {
      platform: opts.platform,
      testflight_build_number: opts.testflight_build_number,
      testflight_group: opts.testflight_group || 'internal',
      play_track: opts.play_track,
      play_rollout_fraction: opts.play_rollout_fraction,
    };
    // BLOCKED: real ASC / Play upload is infra-owned; queue honestly.
    release.sync_status = 'pending_sync';
    release.sync_error = 'BLOCKED: App Store Connect / Play Console upload is infra-owned (credentials + API wiring pending); queued as pending_sync.';
    release.beta_promoted_at = new Date();
    release.promotion_history = [...(release.promotion_history || []), { from, to: 'beta', at: new Date(), by: opts.promoted_by }];
    await release.save();
    this.logger.log(`Promoted release ${release.version} (${release.app}) internal → beta [${opts.platform}], pending_sync`);
    return release;
  }

  /**
   * Promote beta → production per app.
   *
   * Gate: recorded crash-free ≥ 99.5% AND ANR ≤ 0.47% on the version.
   * Metrics may be supplied with the call (recorded first) or must already
   * be recorded via recordVersionHealth; missing metrics → 400.
   *
   * BLOCKED (infra-owned): the actual production release / staged-rollout
   * push to App Store Connect / Play Console. Queued as `pending_sync`,
   * never fake-synced.
   */
  async promoteToProduction(versionId: string, opts: PromoteProductionOpts = {}): Promise<ReleaseVersionDocument> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');
    if (release.channel !== 'beta') throw new BadRequestException('only_beta_can_promote_to_production');

    if (opts.crash_free_rate !== undefined || opts.anr_rate !== undefined) {
      if (opts.crash_free_rate === undefined || opts.anr_rate === undefined) {
        throw new BadRequestException('both_crash_free_rate_and_anr_rate_required');
      }
      assertValidHealth(opts.crash_free_rate, opts.anr_rate);
      release.crash_free_rate = opts.crash_free_rate;
      release.anr_rate = opts.anr_rate;
    }

    if (release.crash_free_rate === undefined || release.crash_free_rate === null ||
        release.anr_rate === undefined || release.anr_rate === null) {
      throw new BadRequestException('health_metrics_required');
    }
    if (release.crash_free_rate < CRASH_FREE_MIN) {
      throw new BadRequestException(`crash_free_rate_${release.crash_free_rate}_below_threshold_${CRASH_FREE_MIN}`);
    }
    if (release.anr_rate > ANR_MAX) {
      throw new BadRequestException(`anr_rate_${release.anr_rate}_above_threshold_${ANR_MAX}`);
    }

    const from = release.channel;
    release.channel = 'production';
    // BLOCKED: real production push is infra-owned; queue honestly.
    release.sync_status = 'pending_sync';
    release.sync_error = 'BLOCKED: App Store Connect / Play Console production release is infra-owned (credentials + API wiring pending); queued as pending_sync.';
    release.production_promoted_at = new Date();
    release.promotion_history = [...(release.promotion_history || []), { from, to: 'production', at: new Date(), by: opts.promoted_by }];
    await release.save();
    this.logger.log(`Promoted release ${release.version} (${release.app}) beta → production, pending_sync`);
    return release;
  }

  /**
   * Get release status.
   */
  async getReleaseStatus(app: string, channel?: string): Promise<ReleaseVersionDocument[]> {
    const query: any = { app };
    if (channel) query.channel = channel;
    return this.versionModel.find(query).sort({ createdAt: -1 }).limit(20).lean().exec() as any;
  }

  /**
   * In-app rating prompt logic.
   */
  async shouldShowRatingPrompt(app: 'patient-app' | 'provider-app', userId: string, trigger: string): Promise<boolean> {
    const recentPrompt = await this.promptModel.findOne({
      app,
      user_id: userId,
      trigger,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }, // 30 days
    }).lean().exec();

    if (recentPrompt) return false;

    // Check if user has completed the trigger action
    // This would integrate with order/booking completion
    return true; // Simplified - real implementation would check actual completion
  }

  async recordRatingPrompt(app: 'patient-app' | 'provider-app', userId: string, trigger: string, status: 'shown' | 'dismissed' | 'rated' | 'rate_later', rating?: number): Promise<RatingPromptDocument> {
    const prompt = new this.promptModel({
      app,
      user_id: userId,
      trigger,
      status,
      shown_at: status === 'shown' ? new Date() : undefined,
      rated_at: status === 'rated' ? new Date() : undefined,
      rating,
    });
    await prompt.save();
    return prompt;
  }

  /**
   * Fetch and store app store reviews (Apple App Store / Google Play).
   * Runs daily via cron.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async fetchAppStoreReviews(): Promise<void> {
    // TODO: Integrate with App Store Connect API / Google Play Developer API
    this.logger.log('Fetching app store reviews (placeholder - needs API integration)');
  }

  /**
   * List store reviews with a pending reply (outbox depth for the C6.1 queue).
   */
  async listPendingReviews(app?: string, platform?: 'ios' | 'android'): Promise<AppStoreReviewDocument[]> {
    const query: any = { reply_status: { $in: ['queued', 'failed'] } };
    if (app) query.app = app;
    if (platform) query.platform = platform;
    return this.reviewModel.find(query).sort({ createdAt: 1 }).limit(100).lean().exec() as any;
  }

  /**
   * List all store reviews (admin browsing).
   */
  async listStoreReviews(app?: string, platform?: string): Promise<AppStoreReviewDocument[]> {
    const query: any = {};
    if (app) query.app = app;
    if (platform) query.platform = platform;
    return this.reviewModel.find(query).sort({ fetched_at: -1 }).limit(100).lean().exec() as any;
  }

  /**
   * C6.1 reply pipeline (durable outbox):
   *   admin submits reply → stored with status `queued` → sync worker stub
   *   attempts the provider API sync when credentials exist, else the reply
   *   stays `queued` (honest, never fake-sent). Only a real provider
   *   confirmation (confirmProviderReplySent) may flip to `sent`.
   */
  async submitReviewReply(reviewId: string, content: string, repliedBy: string): Promise<AppStoreReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');
    const body = (content || '').trim();
    if (!body) throw new BadRequestException('reply_content_required');
    if (body.length > REVIEW_REPLY_MAX_LENGTH) {
      throw new BadRequestException(`reply_content_exceeds_${REVIEW_REPLY_MAX_LENGTH}_chars`);
    }
    // Double-reply block: never reply twice to the same review.
    if (review.reply_status === 'sent' || review.replied === true) throw new BadRequestException('already_replied');
    if (review.reply_status === 'queued') throw new BadRequestException('reply_already_queued');

    review.reply_content = body;
    review.replied_by = repliedBy;
    review.replied_at = new Date();
    review.reply_status = 'queued';
    review.reply_attempts = 0;
    review.reply_error = undefined;
    await review.save();

    // Best-effort sync attempt; stays queued when provider is unreachable.
    await this.attemptReplySync(review);
    this.logger.log(`Queued ${review.platform} review reply ${review.review_id} (attempt ${review.reply_attempts})`);
    return review;
  }

  /**
   * Sync worker stub: tries to push one queued reply to the provider.
   *
   * BLOCKED (infra-owned): real calls —
   *   - Apple: App Store Connect API customer-review responses
   *     (requires ASC API key + issuer; route owned by infra).
   *   - Google: androidpublisher reviews.reply
   *     (requires Play service-account; route owned by infra).
   * When credentials exist we still do NOT fabricate success: the reply is
   * left `queued` with a BLOCKED note and `pending_sync` semantics until
   * infra wires the route. This method never marks anything `sent`.
   */
  async attemptReplySync(review: AppStoreReviewDocument): Promise<{ synced: boolean; reason: string }> {
    review.reply_attempts = (review.reply_attempts || 0) + 1;
    if (!this.hasStoreCredentials(review.platform)) {
      review.reply_error = 'awaiting_credentials: store API credentials not configured; reply stays queued.';
      await review.save();
      return { synced: false, reason: 'missing_credentials' };
    }
    // BLOCKED: credentials present but the provider route is infra-owned.
    review.reply_error = 'BLOCKED: store reply API route is infra-owned (pending_sync); reply stays queued, never fake-sent.';
    await review.save();
    return { synced: false, reason: 'provider_route_blocked' };
  }

  /**
   * Retry the whole outbox (queued + failed). Returns a summary.
   */
  async retryReplyQueue(limit = 50): Promise<{ attempted: number; still_queued: number }> {
    const pending = await this.reviewModel
      .find({ reply_status: { $in: ['queued', 'failed'] } })
      .sort({ createdAt: 1 })
      .limit(Math.max(1, Math.min(limit, 200)))
      .exec() as any as AppStoreReviewDocument[];
    let attempted = 0;
    for (const review of pending || []) {
      attempted += 1;
      try {
        await this.attemptReplySync(review);
      } catch (err: any) {
        review.reply_status = 'failed';
        review.reply_error = String(err?.message || err);
        await review.save();
      }
    }
    const still = await this.reviewModel.countDocuments({ reply_status: { $in: ['queued', 'failed'] } }).exec();
    return { attempted, still_queued: still };
  }

  /**
   * Provider-side confirmation hook (infra webhook / verified sync only).
   * The ONLY path that may mark a reply `sent`.
   */
  async confirmProviderReplySent(reviewId: string): Promise<AppStoreReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');
    review.reply_status = 'sent';
    review.replied = true;
    review.provider_synced_at = new Date();
    review.reply_error = undefined;
    await review.save();
    return review;
  }

  private hasStoreCredentials(platform: string): boolean {
    if (platform === 'ios') {
      return !!(process.env.APP_STORE_CONNECT_KEY_ID && process.env.APP_STORE_CONNECT_ISSUER_ID);
    }
    return !!process.env.PLAY_SERVICE_ACCOUNT_JSON;
  }

  /** Hourly outbox flush for the C6.1 queue. */
  @Cron(CronExpression.EVERY_HOUR)
  async flushReplyOutbox(): Promise<void> {
    try {
      const res = await this.retryReplyQueue(50);
      if (res.attempted > 0) this.logger.log(`Reply outbox flush: attempted=${res.attempted} still_queued=${res.still_queued}`);
    } catch (err: any) {
      this.logger.warn(`Reply outbox flush failed: ${err?.message || err}`);
    }
  }

  /**
   * Back-compat alias for the pre-outbox API (now durable-queued).
   */
  async replyToStoreReview(reviewId: string, content: string, repliedBy: string): Promise<AppStoreReviewDocument> {
    return this.submitReviewReply(reviewId, content, repliedBy);
  }

  /**
   * Get release checklist for a version.
   */
  async getReleaseChecklist(versionId: string): Promise<any> {
    const release = await this.versionModel.findById(versionId);
    if (!release) throw new NotFoundException('release_not_found');

    return {
      version: release.version,
      app: release.app,
      channel: release.channel,
      status: release.status,
      checks: {
        build_passed: !!release.build_metadata?.build_passed,
        tests_passed: !!release.build_metadata?.tests_passed,
        crash_free_rate_ok: release.crash_free_rate ? release.crash_free_rate >= 99.5 : false,
        anr_rate_ok: release.anr_rate ? release.anr_rate <= 0.47 : false,
        rollout_percentage: release.rollout_percentage,
        current_rollout_status: await this.getCurrentRolloutStatus(release.id),
      },
      next_steps: await this.getNextSteps(release),
    };
  }

  private async getCurrentRolloutStatus(releaseVersionId: string): Promise<any> {
    const rollout = await this.rolloutModel.findOne({ 
      release_version_id: releaseVersionId 
    }).sort({ createdAt: -1 }).lean().exec() as any;
    return rollout || null;
  }

  private async getNextSteps(release: ReleaseVersionDocument): Promise<string[]> {
    const steps = [];
    switch (release.status) {
      case 'draft':
        steps.push('Run build and tests');
        steps.push('Submit for beta review');
        break;
      case 'submitted':
        steps.push('Wait for beta approval');
        break;
      case 'approved':
        steps.push('Start rollout at 10%');
        break;
      case 'rolled_out':
        const currentRollout = await this.getCurrentRolloutStatus(release.id);
        if (currentRollout && currentRollout.status === 'started') {
          steps.push('Monitor crash-free rate and ANR rate');
          steps.push('Advance rollout to next percentage');
        } else {
          steps.push('Rollout complete');
        }
        break;
      case 'halted':
        steps.push('Fix issues and re-submit');
        break;
    }
    return steps;
  }
}

function assertValidHealth(crashFreeRate: number, anrRate: number): void {
  if (!Number.isFinite(crashFreeRate) || crashFreeRate < 0 || crashFreeRate > 100) {
    throw new BadRequestException('crash_free_rate_must_be_between_0_and_100');
  }
  if (!Number.isFinite(anrRate) || anrRate < 0 || anrRate > 100) {
    throw new BadRequestException('anr_rate_must_be_between_0_and_100');
  }
}
