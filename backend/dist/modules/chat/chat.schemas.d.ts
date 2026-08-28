import { Document } from 'mongoose';
export declare class ChatThread {
    id: string;
    type: string;
    participant_ids: string[];
    name?: string;
    avatar_url?: string;
    booking_kind?: string;
    booking_id?: string;
    last_message?: string;
    last_message_at?: Date;
    last_message_sender_id?: string;
    unread_counts: Record<string, number>;
    is_active: boolean;
    created_by?: string;
}
export type ChatThreadDocument = ChatThread & Document;
export declare const ChatThreadSchema: import("mongoose").Schema<ChatThread, import("mongoose").Model<ChatThread, any, any, any, Document<unknown, any, ChatThread, any, {}> & ChatThread & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatThread, Document<unknown, {}, import("mongoose").FlatRecord<ChatThread>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ChatThread> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class ChatMessage {
    id: string;
    client_message_id?: string;
    thread_id: string;
    sender_id: string;
    sender_role: string;
    body: string;
    type: string;
    attachment_url?: string;
    attachment_mime?: string;
    attachment_name?: string;
    attachment_size?: number;
    duration_seconds?: number;
    reply_to_id?: string;
    forwarded_from_id?: string;
    media_ids: string[];
    reactions: Record<string, string[]>;
    read_by: string[];
    delivered_to: string[];
    is_edited: boolean;
    edited_at?: Date;
    is_deleted: boolean;
    deleted_at?: Date;
    is_pinned: boolean;
}
export type ChatMessageDocument = ChatMessage & Document;
export declare const ChatMessageSchema: import("mongoose").Schema<ChatMessage, import("mongoose").Model<ChatMessage, any, any, any, Document<unknown, any, ChatMessage, any, {}> & ChatMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<ChatMessage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ChatMessage> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
