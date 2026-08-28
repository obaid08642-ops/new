import { Document, Types } from 'mongoose';
export type ChatSessionDocument = ChatSession & Document;
export declare class ChatSession {
    type: string;
    appointment_id: string;
    family_group_id: string;
    status: string;
}
export declare const ChatSessionSchema: import("mongoose").Schema<ChatSession, import("mongoose").Model<ChatSession, any, any, any, Document<unknown, any, ChatSession, any, {}> & ChatSession & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatSession, Document<unknown, {}, import("mongoose").FlatRecord<ChatSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ChatSession> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
