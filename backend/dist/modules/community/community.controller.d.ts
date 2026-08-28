import { CommunityService } from './community.service';
export declare class CommunityController {
    private readonly communityService;
    constructor(communityService: CommunityService);
    listPosts(page: string, limit: string, tag: string, category: string): Promise<{
        posts: any;
        total: any;
        page: number;
        limit: number;
    }>;
    createPost(req: any, body: any): Promise<{
        ok: boolean;
        post_id: any;
        status: any;
    }>;
    getPost(id: string): Promise<{
        post: any;
        comments: any;
    }>;
    addComment(req: any, postId: string, body: {
        body: string;
        is_anonymous?: boolean;
    }): Promise<{
        ok: boolean;
        comment_id: any;
    }>;
    votePost(req: any, postId: string, body: {
        vote: 'up' | 'down';
    }): Promise<{
        ok: boolean;
        action: string;
    }>;
    deletePost(req: any, postId: string): Promise<{
        ok: boolean;
    }>;
    pendingPosts(page: string): Promise<{
        posts: any;
        total: any;
        page: number;
    }>;
    moderatePost(postId: string, body: {
        decision: 'published' | 'removed';
    }): Promise<{
        ok: boolean;
        decision: "published" | "removed";
    }>;
    listSessions(status: string): Promise<any>;
    createSession(req: any, body: any): Promise<{
        ok: boolean;
        session_id: any;
    }>;
    joinSession(req: any, sessionId: string): Promise<{
        ok: boolean;
        action: string;
        session_id?: undefined;
    } | {
        ok: boolean;
        action: string;
        session_id: string;
    }>;
    updateSessionStatus(sessionId: string, body: {
        status: 'live' | 'ended' | 'cancelled';
        stream_url?: string;
    }): Promise<{
        ok: boolean;
        status: "cancelled" | "ended" | "live";
    }>;
}
