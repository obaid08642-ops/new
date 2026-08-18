import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostRepository } from "./repositories/post.repository";
import { PostCommentRepository } from "./repositories/postcomment.repository";
import { LiveSessionRepository } from "./repositories/livesession.repository";

// Sensitive keywords that trigger auto-moderation
const SENSITIVE_KEYWORDS = [
  'دواء مخدر', 'مخدرات', 'انتحار', 'self harm', 'suicide',
  'illegal', 'غير قانوني', 'تزوير',
];

function requiresModeration(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

@Injectable()
export class CommunityService {
  constructor(
    @Inject('PostRepository') private postM: PostRepository,
    @Inject('PostCommentRepository') private commentM: PostCommentRepository,
    @Inject('LiveSessionRepository') private sessionM: LiveSessionRepository,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  async listPosts(page = 1, limit = 20, tag?: string, category?: string) {
    const query: any = { status: 'published', is_deleted: { $ne: true } };
    if (tag) query.tags = tag;
    if (category) query.category = category;
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postM.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.postM.countDocuments(query),
    ]);
    return { posts, total, page, limit };
  }

  async createPost(authorId: string, body: {
    title: string; body: string; tags?: string[];
    category?: string; is_anonymous?: boolean;
  }) {
    const needsReview = requiresModeration(body.title + ' ' + body.body);
    const post = await this.postM.create({
      id: uuidv4(),
      author_id: authorId,
      status: needsReview ? 'pending_review' : 'published',
      ...body,
    });
    return { ok: true, post_id: post.id, status: post.status };
  }

  async getPostDetail(postId: string) {
    const post = await this.postM.findOne({ id: postId, is_deleted: { $ne: true } }).lean();
    if (!post) throw new NotFoundException('Post not found');
    const comments = await this.commentM
      .find({ post_id: postId, is_deleted: { $ne: true }, status: 'published' })
      .sort({ createdAt: 1 })
      .lean();
    return { post, comments };
  }

  async addComment(authorId: string, postId: string, body: string, isAnonymous = false) {
    const post = await this.postM.findOne({ id: postId, status: 'published', is_deleted: { $ne: true } }).lean();
    if (!post) throw new NotFoundException('Post not found or not accessible');
    const needsReview = requiresModeration(body);
    const comment = await this.commentM.create({
      id: uuidv4(),
      post_id: postId,
      author_id: authorId,
      body,
      is_anonymous: isAnonymous,
      status: needsReview ? 'removed' : 'published',
    });
    // Increment comment count only for published comments — a moderated
    // (removed) comment must not inflate the public counter.
    if (!needsReview) {
      await this.postM.updateOne({ id: postId }, { $inc: { comment_count: 1 } });
    }
    // S20: community-scenario notification hook — tell the post author
    // about the new reply (never notify about your own comment).
    try {
      const postAuthorId = (post as any).author_id;
      if (!needsReview && postAuthorId && postAuthorId !== authorId) {
        this.eventEmitter?.emit('community.comment_added', {
          post_id: postId,
          post_author_id: postAuthorId,
          commenter_id: authorId,
        });
      }
    } catch { /* notification must never break commenting */ }
    return { ok: true, comment_id: comment.id };
  }

  async votePost(userId: string, postId: string, vote: 'up' | 'down') {
    const post: any = await this.postM.findOne({ id: postId, status: 'published', is_deleted: { $ne: true } }).lean();
    if (!post) throw new NotFoundException('Post not found');
    if (vote === 'up') {
      if (post.upvoter_ids?.includes(userId)) {
        // Undo upvote
        await this.postM.updateOne({ id: postId }, { $inc: { upvotes: -1 }, $pull: { upvoter_ids: userId } });
        return { ok: true, action: 'upvote_removed' };
      }
      // Remove from downvoters if was downvoted
      await this.postM.updateOne(
        { id: postId },
        { $inc: { upvotes: 1, downvotes: post.downvoter_ids?.includes(userId) ? -1 : 0 }, $addToSet: { upvoter_ids: userId }, $pull: { downvoter_ids: userId } },
      );
      return { ok: true, action: 'upvoted' };
    } else {
      if (post.downvoter_ids?.includes(userId)) {
        await this.postM.updateOne({ id: postId }, { $inc: { downvotes: -1 }, $pull: { downvoter_ids: userId } });
        return { ok: true, action: 'downvote_removed' };
      }
      await this.postM.updateOne(
        { id: postId },
        { $inc: { downvotes: 1, upvotes: post.upvoter_ids?.includes(userId) ? -1 : 0 }, $addToSet: { downvoter_ids: userId }, $pull: { upvoter_ids: userId } },
      );
      return { ok: true, action: 'downvoted' };
    }
  }

  async deletePost(userId: string, postId: string) {
    const post: any = await this.postM.findOne({ id: postId, is_deleted: { $ne: true } }).lean();
    if (!post) throw new NotFoundException('Post not found');
    if (post.author_id !== userId) throw new ForbiddenException('You can only delete your own posts');
    await this.postM.updateOne({ id: postId }, { is_deleted: true });
    return { ok: true };
  }

  // ── Admin Moderation ───────────────────────────────────────────────────────

  async getPendingPosts(page = 1, limit = 20) {
    const [posts, total] = await Promise.all([
      this.postM.find({ status: 'pending_review', is_deleted: { $ne: true } })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.postM.countDocuments({ status: 'pending_review', is_deleted: { $ne: true } }),
    ]);
    return { posts, total, page };
  }

  async moderatePost(postId: string, decision: 'published' | 'removed') {
    const post = await this.postM.findOne({ id: postId }).lean();
    if (!post) throw new NotFoundException('Post not found');
    await this.postM.updateOne({ id: postId }, { status: decision });
    return { ok: true, decision };
  }

  // ── Live Sessions ──────────────────────────────────────────────────────────

  async listSessions(status?: string) {
    const query: any = { is_deleted: { $ne: true } };
    if (status) query.status = status;
    else query.status = { $in: ['upcoming', 'live'] };
    return this.sessionM.find(query).sort({ scheduled_at: 1 }).lean();
  }

  async createSession(hostId: string, body: {
    title: string; description?: string; scheduled_at: Date;
    tags?: string[]; host_name?: string; host_specialty?: string;
  }) {
    const session = await this.sessionM.create({
      id: uuidv4(),
      host_id: hostId,
      status: 'upcoming',
      ...body,
    });
    return { ok: true, session_id: session.id };
  }

  async joinSession(userId: string, sessionId: string) {
    const session: any = await this.sessionM.findOne({ id: sessionId, is_deleted: { $ne: true } }).lean();
    if (!session) throw new NotFoundException('Session not found');
    if (!['upcoming', 'live'].includes(session.status)) throw new BadRequestException('Session is not available to join');
    if (session.attendee_ids?.includes(userId)) return { ok: true, action: 'already_joined' };
    await this.sessionM.updateOne(
      { id: sessionId },
      { $addToSet: { attendee_ids: userId }, $inc: { attendee_count: 1 } },
    );
    return { ok: true, action: 'joined', session_id: sessionId };
  }

  async updateSessionStatus(sessionId: string, status: 'live' | 'ended' | 'cancelled', streamUrl?: string) {
    const update: any = { status };
    if (streamUrl) update.stream_url = streamUrl;
    await this.sessionM.updateOne({ id: sessionId }, update);
    return { ok: true, status };
  }
}
