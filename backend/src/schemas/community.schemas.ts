import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ─── Post ─────────────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'community_posts' })
export class Post extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) author_id: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
  /** e.g. ['diabetes', 'nutrition', 'ask-doctor'] */
  @Prop({ type: [String], default: [], index: true }) tags: string[];
  /** 'question' | 'experience' | 'health-tip' | 'general' */
  @Prop({ default: 'general' }) category: string;
  @Prop({ default: 0 }) upvotes: number;
  @Prop({ default: 0 }) downvotes: number;
  /** Voters to prevent double-voting */
  @Prop({ type: [String], default: [] }) upvoter_ids: string[];
  @Prop({ type: [String], default: [] }) downvoter_ids: string[];
  @Prop({ default: false }) is_anonymous: boolean;
  /**
   * 'published' | 'pending_review' | 'removed'
   * Posts flagged with sensitive keywords are auto-set to 'pending_review'
   */
  @Prop({ default: 'published', index: true }) status: string;
  @Prop({ default: 0 }) comment_count: number;
  @Prop({ default: false }) is_deleted: boolean;
}
export const PostSchema = SchemaFactory.createForClass(Post);

// ─── PostComment ──────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'community_comments' })
export class PostComment extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) post_id: string;
  @Prop({ required: true }) author_id: string;
  @Prop({ required: true }) body: string;
  @Prop({ default: 0 }) upvotes: number;
  @Prop({ type: [String], default: [] }) upvoter_ids: string[];
  /** 'published' | 'removed' */
  @Prop({ default: 'published' }) status: string;
  @Prop({ default: false }) is_anonymous: boolean;
  @Prop({ default: false }) is_deleted: boolean;
}
export const PostCommentSchema = SchemaFactory.createForClass(PostComment);

// ─── LiveSession ──────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'community_live_sessions' })
export class LiveSession extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true }) host_id: string;
  @Prop() host_name?: string;
  @Prop() host_specialty?: string;
  @Prop({ required: true }) title: string;
  @Prop() description?: string;
  @Prop({ required: true }) scheduled_at: Date;
  /** 'upcoming' | 'live' | 'ended' | 'cancelled' */
  @Prop({ default: 'upcoming', index: true }) status: string;
  @Prop({ default: 0 }) attendee_count: number;
  @Prop({ type: [String], default: [] }) attendee_ids: string[];
  @Prop() stream_url?: string;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ default: false }) is_deleted: boolean;
}
export const LiveSessionSchema = SchemaFactory.createForClass(LiveSession);
