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
   * Reply to an app store review.
   */
  async replyToStoreReview(reviewId: string, content: string, repliedBy: string): Promise<AppStoreReviewDocument> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('review_not_found');
    if (review.replied) throw new BadRequestException('already_replied');

    review.replied = true;
    review.reply_content = content;
    review.replied_at = new Date();
    review.replied_by = repliedBy;
    await review.save();

    // TODO: Push reply to App Store Connect / Google Play Console
    this.logger.log(`Replied to ${review.platform} review ${review.review_id}`);
    return review;
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
