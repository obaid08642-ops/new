import { Document } from 'mongoose';
export declare class CallSession {
    id: string;
    appointment_id: string;
    patient_id: string;
    provider_id: string;
    room_name?: string;
    call_type: string;
    status: string;
    started_at?: Date;
    ended_at?: Date;
    duration_seconds?: number;
    end_reason?: string;
}
export type CallSessionDocument = CallSession & Omit<Document, 'id'>;
export declare const CallSessionSchema: import("mongoose").Schema<CallSession, import("mongoose").Model<CallSession, any, any, any, Document<unknown, any, CallSession, any, {}> & CallSession & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CallSession, Document<unknown, {}, import("mongoose").FlatRecord<CallSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CallSession> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
