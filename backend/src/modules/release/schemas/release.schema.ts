import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ReleaseVersionDocument = ReleaseVersion & Document;
export type ReleaseRolloutDocument = ReleaseRollout & Document;
export type AppStoreReviewDocument = AppStoreReview & Document;
export type RatingPromptDocument = RatingPrompt & Document;

@Schema({ collection: 'release_versions', timestamps: true })
export class ReleaseVersion {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true }) version: string;
  @Prop({ required: true, enum: ['patient-app', 'provider-app', 'patient-web', 'admin'] }) app: string;
  @Prop({ required: true, enum: ['internal', 'beta', 'production'] }) channel: 'internal' | 'beta' | 'production';
  @Prop({ required: true, enum: ['draft', 'submitted', 'approved', 'rejected', 'rolled_out', 'halted'] }) status: string;
  @Prop({ type: Object }) build_metadata?: Record<string, any>;
  @Prop() submitted_at?: Date;
  @Prop() approved_at?: Date;
  @Prop() rolled_out_at?: Date;
  @Prop() halted_at?: Date;
  @Prop() halt_reason?: string;
  @Prop({ type: [Number] }) rollout_percentage?: number[];
  @Prop() crash_free_rate?: number;
  @Prop() anr_rate?: number;
  @Prop() notes?: string;
  /**
   * Phase 22.13 (P22.1.2): beta channel track details.
   * iOS  -> TestFlight (build number + internal/external group).
   * Android -> Play track (internal/closed) + rollout fraction.
   */
  @Prop({ type: Object }) beta_track?: {
    platform: 'ios' | 'android';
    testflight_build_number?: string;
    testflight_group?: 'internal' | 'external';
    play_track?: 'internal' | 'closed';
    play_rollout_fraction?: number;
  };
  /**
   * External store sync state. Real App Store Connect / Play Console
   * uploads are infra-owned (see ReleaseService BLOCKED notes); until the
   * provider confirms, versions stay `pending_sync` — never fake `synced`.
   */
  @Prop({ enum: ['synced', 'pending_sync', 'failed'], default: 'pending_sync' }) sync_status?: string;
  @Prop() sync_error?: string;
  @Prop() beta_promoted_at?: Date;
  @Prop() production_promoted_at?: Date;
  @Prop({ type: [Object] }) promotion_history?: Array<{ from: string; to: string; at: Date; by?: string }>;
}

export const ReleaseVersionSchema = SchemaFactory.createForClass(ReleaseVersion);
ReleaseVersionSchema.index({ app: 1, channel: 1, createdAt: -1 });
ReleaseVersionSchema.index({ version: 1, app: 1 }, { unique: true });

@Schema({ collection: 'release_rollouts', timestamps: true })
export class ReleaseRollout {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true }) release_version_id: string;
  @Prop({ required: true }) percentage: number;
  @Prop({ required: true, enum: ['started', 'paused', 'completed', 'halted'] }) status: string;
  @Prop() crash_free_rate?: number;
  @Prop() anr_rate?: number;
  @Prop() started_at?: Date;
  @Prop() completed_at?: Date;
  @Prop() halted_at?: Date;
  @Prop() halt_reason?: string;
}

export const ReleaseRolloutSchema = SchemaFactory.createForClass(ReleaseRollout);
ReleaseRolloutSchema.index({ release_version_id: 1 });

@Schema({ collection: 'app_store_reviews', timestamps: true })
export class AppStoreReview {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, enum: ['patient-app', 'provider-app'] }) app: string;
  @Prop({ required: true }) platform: 'ios' | 'android';
  @Prop({ required: true }) review_id: string;
  @Prop({ required: true }) rating: number;
  @Prop() title?: string;
  @Prop({ required: true }) content: string;
  @Prop({ required: true }) author: string;
  @Prop({ required: true }) version: string;
  @Prop() replied: boolean;
  @Prop() reply_content?: string;
  @Prop() replied_at?: Date;
  @Prop() replied_by?: string;
  @Prop() fetched_at: Date;
  /**
   * Phase 22.13 / C6.1 (P22.1.2): durable reply outbox. Admin replies are
   * stored first (`queued`); only a real provider confirmation (webhook or
   * verified sync) may flip to `sent`. Never fake-sent.
   */
  @Prop({ enum: ['queued', 'sent', 'failed'] }) reply_status?: 'queued' | 'sent' | 'failed';
  @Prop() reply_attempts?: number;
  @Prop() reply_error?: string;
  @Prop() provider_synced_at?: Date;
}

export const AppStoreReviewSchema = SchemaFactory.createForClass(AppStoreReview);
AppStoreReviewSchema.index({ app: 1, platform: 1, fetched_at: -1 });
AppStoreReviewSchema.index({ review_id: 1, platform: 1 }, { unique: true });

@Schema({ collection: 'rating_prompts', timestamps: true })
export class RatingPrompt {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, enum: ['patient-app', 'provider-app'] }) app: string;
  @Prop({ required: true }) user_id: string;
  @Prop({ required: true, enum: ['order_delivered', 'booking_completed', 'prescription_filled', 'refill_created'] }) trigger: string;
  @Prop({ required: true, enum: ['shown', 'dismissed', 'rated', 'rate_later'] }) status: string;
  @Prop() shown_at?: Date;
  @Prop() rated_at?: Date;
  @Prop() rating?: number;
}

export const RatingPromptSchema = SchemaFactory.createForClass(RatingPrompt);
RatingPromptSchema.index({ app: 1, user_id: 1, trigger: 1 });
RatingPromptSchema.index({ user_id: 1, createdAt: -1 });
