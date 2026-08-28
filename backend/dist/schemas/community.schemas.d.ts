import { Document } from 'mongoose';
export declare class Post extends Document {
    id: string;
    author_id: string;
    title: string;
    body: string;
    tags: string[];
    category: string;
    upvotes: number;
    downvotes: number;
    upvoter_ids: string[];
    downvoter_ids: string[];
    is_anonymous: boolean;
    status: string;
    comment_count: number;
    is_deleted: boolean;
}
export declare const PostSchema: import("mongoose").Schema<Post, import("mongoose").Model<Post, any, any, any, Document<unknown, any, Post, any, {}> & Post & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Post, Document<unknown, {}, import("mongoose").FlatRecord<Post>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Post> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PostComment extends Document {
    id: string;
    post_id: string;
    author_id: string;
    body: string;
    upvotes: number;
    upvoter_ids: string[];
    status: string;
    is_anonymous: boolean;
    is_deleted: boolean;
}
export declare const PostCommentSchema: import("mongoose").Schema<PostComment, import("mongoose").Model<PostComment, any, any, any, Document<unknown, any, PostComment, any, {}> & PostComment & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PostComment, Document<unknown, {}, import("mongoose").FlatRecord<PostComment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PostComment> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class LiveSession extends Document {
    id: string;
    host_id: string;
    host_name?: string;
    host_specialty?: string;
    title: string;
    description?: string;
    scheduled_at: Date;
    status: string;
    attendee_count: number;
    attendee_ids: string[];
    stream_url?: string;
    tags: string[];
    is_deleted: boolean;
}
export declare const LiveSessionSchema: import("mongoose").Schema<LiveSession, import("mongoose").Model<LiveSession, any, any, any, Document<unknown, any, LiveSession, any, {}> & LiveSession & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LiveSession, Document<unknown, {}, import("mongoose").FlatRecord<LiveSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LiveSession> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
