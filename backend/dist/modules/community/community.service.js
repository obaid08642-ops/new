"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const event_emitter_1 = require("@nestjs/event-emitter");
const post_repository_1 = require("./repositories/post.repository");
const postcomment_repository_1 = require("./repositories/postcomment.repository");
const livesession_repository_1 = require("./repositories/livesession.repository");
const SENSITIVE_KEYWORDS = [
    'دواء مخدر', 'مخدرات', 'انتحار', 'self harm', 'suicide',
    'illegal', 'غير قانوني', 'تزوير',
];
function requiresModeration(text) {
    const lower = text.toLowerCase();
    return SENSITIVE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}
let CommunityService = class CommunityService {
    constructor(postM, commentM, sessionM, eventEmitter) {
        this.postM = postM;
        this.commentM = commentM;
        this.sessionM = sessionM;
        this.eventEmitter = eventEmitter;
    }
    async listPosts(page = 1, limit = 20, tag, category) {
        const query = { status: 'published', is_deleted: { $ne: true } };
        if (tag)
            query.tags = tag;
        if (category)
            query.category = category;
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            this.postM.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            this.postM.countDocuments(query),
        ]);
        return { posts, total, page, limit };
    }
    async createPost(authorId, body) {
        const needsReview = requiresModeration(body.title + ' ' + body.body);
        const post = await this.postM.create({
            id: (0, uuid_1.v4)(),
            author_id: authorId,
            status: needsReview ? 'pending_review' : 'published',
            ...body,
        });
        return { ok: true, post_id: post.id, status: post.status };
    }
    async getPostDetail(postId) {
        const post = await this.postM.findOne({ id: postId, is_deleted: { $ne: true } }).lean();
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        const comments = await this.commentM
            .find({ post_id: postId, is_deleted: { $ne: true }, status: 'published' })
            .sort({ createdAt: 1 })
            .lean();
        return { post, comments };
    }
    async addComment(authorId, postId, body, isAnonymous = false) {
        const post = await this.postM.findOne({ id: postId, status: 'published', is_deleted: { $ne: true } }).lean();
        if (!post)
            throw new common_1.NotFoundException('Post not found or not accessible');
        const needsReview = requiresModeration(body);
        const comment = await this.commentM.create({
            id: (0, uuid_1.v4)(),
            post_id: postId,
            author_id: authorId,
            body,
            is_anonymous: isAnonymous,
            status: needsReview ? 'removed' : 'published',
        });
        if (!needsReview) {
            await this.postM.updateOne({ id: postId }, { $inc: { comment_count: 1 } });
        }
        try {
            const postAuthorId = post.author_id;
            if (!needsReview && postAuthorId && postAuthorId !== authorId) {
                this.eventEmitter?.emit('community.comment_added', {
                    post_id: postId,
                    post_author_id: postAuthorId,
                    commenter_id: authorId,
                });
            }
        }
        catch { }
        return { ok: true, comment_id: comment.id };
    }
    async votePost(userId, postId, vote) {
        const post = await this.postM.findOne({ id: postId, status: 'published', is_deleted: { $ne: true } }).lean();
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        if (vote === 'up') {
            if (post.upvoter_ids?.includes(userId)) {
                await this.postM.updateOne({ id: postId }, { $inc: { upvotes: -1 }, $pull: { upvoter_ids: userId } });
                return { ok: true, action: 'upvote_removed' };
            }
            await this.postM.updateOne({ id: postId }, { $inc: { upvotes: 1, downvotes: post.downvoter_ids?.includes(userId) ? -1 : 0 }, $addToSet: { upvoter_ids: userId }, $pull: { downvoter_ids: userId } });
            return { ok: true, action: 'upvoted' };
        }
        else {
            if (post.downvoter_ids?.includes(userId)) {
                await this.postM.updateOne({ id: postId }, { $inc: { downvotes: -1 }, $pull: { downvoter_ids: userId } });
                return { ok: true, action: 'downvote_removed' };
            }
            await this.postM.updateOne({ id: postId }, { $inc: { downvotes: 1, upvotes: post.upvoter_ids?.includes(userId) ? -1 : 0 }, $addToSet: { downvoter_ids: userId }, $pull: { upvoter_ids: userId } });
            return { ok: true, action: 'downvoted' };
        }
    }
    async deletePost(userId, postId) {
        const post = await this.postM.findOne({ id: postId, is_deleted: { $ne: true } }).lean();
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        if (post.author_id !== userId)
            throw new common_1.ForbiddenException('You can only delete your own posts');
        await this.postM.updateOne({ id: postId }, { is_deleted: true });
        return { ok: true };
    }
    async getPendingPosts(page = 1, limit = 20) {
        const [posts, total] = await Promise.all([
            this.postM.find({ status: 'pending_review', is_deleted: { $ne: true } })
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            this.postM.countDocuments({ status: 'pending_review', is_deleted: { $ne: true } }),
        ]);
        return { posts, total, page };
    }
    async moderatePost(postId, decision) {
        const post = await this.postM.findOne({ id: postId }).lean();
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        await this.postM.updateOne({ id: postId }, { status: decision });
        return { ok: true, decision };
    }
    async listSessions(status) {
        const query = { is_deleted: { $ne: true } };
        if (status)
            query.status = status;
        else
            query.status = { $in: ['upcoming', 'live'] };
        return this.sessionM.find(query).sort({ scheduled_at: 1 }).lean();
    }
    async createSession(hostId, body) {
        const session = await this.sessionM.create({
            id: (0, uuid_1.v4)(),
            host_id: hostId,
            status: 'upcoming',
            ...body,
        });
        return { ok: true, session_id: session.id };
    }
    async joinSession(userId, sessionId) {
        const session = await this.sessionM.findOne({ id: sessionId, is_deleted: { $ne: true } }).lean();
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (!['upcoming', 'live'].includes(session.status))
            throw new common_1.BadRequestException('Session is not available to join');
        if (session.attendee_ids?.includes(userId))
            return { ok: true, action: 'already_joined' };
        await this.sessionM.updateOne({ id: sessionId }, { $addToSet: { attendee_ids: userId }, $inc: { attendee_count: 1 } });
        return { ok: true, action: 'joined', session_id: sessionId };
    }
    async updateSessionStatus(sessionId, status, streamUrl) {
        const update = { status };
        if (streamUrl)
            update.stream_url = streamUrl;
        await this.sessionM.updateOne({ id: sessionId }, update);
        return { ok: true, status };
    }
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PostRepository')),
    __param(1, (0, common_1.Inject)('PostCommentRepository')),
    __param(2, (0, common_1.Inject)('LiveSessionRepository')),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [post_repository_1.PostRepository,
        postcomment_repository_1.PostCommentRepository,
        livesession_repository_1.LiveSessionRepository,
        event_emitter_1.EventEmitter2])
], CommunityService);
//# sourceMappingURL=community.service.js.map