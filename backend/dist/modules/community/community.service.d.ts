import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostRepository } from "./repositories/post.repository";
import { PostCommentRepository } from "./repositories/postcomment.repository";
import { LiveSessionRepository } from "./repositories/livesession.repository";
export declare class CommunityService {
    private postM;
    private commentM;
    private sessionM;
    private eventEmitter?;
    constructor(postM: PostRepository, commentM: PostCommentRepository, sessionM: LiveSessionRepository, eventEmitter?: EventEmitter2);
    listPosts(page?: number, limit?: number, tag?: string, category?: string): Promise<{
        posts: any;
        total: any;
        page: number;
        limit: number;
    }>;
    createPost(authorId: string, body: {
        title: string;
        body: string;
        tags?: string[];
        category?: string;
        is_anonymous?: boolean;
    }): Promise<{
        ok: boolean;
        post_id: any;
        status: any;
    }>;
    getPostDetail(postId: string): Promise<{
        post: any;
        comments: any;
    }>;
    addComment(authorId: string, postId: string, body: string, isAnonymous?: boolean): Promise<{
        ok: boolean;
        comment_id: any;
    }>;
    votePost(userId: string, postId: string, vote: 'up' | 'down'): Promise<{
        ok: boolean;
        action: string;
    }>;
    deletePost(userId: string, postId: string): Promise<{
        ok: boolean;
    }>;
    getPendingPosts(page?: number, limit?: number): Promise<{
        posts: any;
        total: any;
        page: number;
    }>;
    moderatePost(postId: string, decision: 'published' | 'removed'): Promise<{
        ok: boolean;
        decision: "published" | "removed";
    }>;
    listSessions(status?: string): Promise<any>;
    createSession(hostId: string, body: {
        title: string;
        description?: string;
        scheduled_at: Date;
        tags?: string[];
        host_name?: string;
        host_specialty?: string;
    }): Promise<{
        ok: boolean;
        session_id: any;
    }>;
    joinSession(userId: string, sessionId: string): Promise<{
        ok: boolean;
        action: string;
        session_id?: undefined;
    } | {
        ok: boolean;
        action: string;
        session_id: string;
    }>;
    updateSessionStatus(sessionId: string, status: 'live' | 'ended' | 'cancelled', streamUrl?: string): Promise<{
        ok: boolean;
        status: "cancelled" | "ended" | "live";
    }>;
}
