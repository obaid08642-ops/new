import { Document } from 'mongoose';
export declare class ChatMessage {
    id: string;
    sender_id: string;
    sender_role: string;
    text?: string;
    image_url?: string;
    created_at: Date;
}
export declare const ChatMessageSchema: import("mongoose").Schema<ChatMessage, import("mongoose").Model<ChatMessage, any, any, any, Document<unknown, any, ChatMessage, any, {}> & ChatMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<ChatMessage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ChatMessage> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PharmacyChatThread {
    id: string;
    order_id: string;
    patient_id: string;
    pharmacy_id: string;
    messages: ChatMessage[];
    status: string;
    last_message_at: Date;
}
export type PharmacyChatThreadDocument = PharmacyChatThread & Document;
export declare const PharmacyChatThreadSchema: import("mongoose").Schema<PharmacyChatThread, import("mongoose").Model<PharmacyChatThread, any, any, any, Document<unknown, any, PharmacyChatThread, any, {}> & PharmacyChatThread & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyChatThread, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyChatThread>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyChatThread> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
