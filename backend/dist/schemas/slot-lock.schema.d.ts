import { Document } from 'mongoose';
export type SlotLockDocument = SlotLock & Document;
export declare class SlotLock {
    id: string;
    provider_id: string;
    patient_id: string;
    booking_kind: string;
    slot_start: Date;
    slot_end: Date;
    status: 'held' | 'confirmed' | 'released' | 'expired';
    expires_at: Date;
    booking_id?: string;
}
export declare const SlotLockSchema: import("mongoose").Schema<SlotLock, import("mongoose").Model<SlotLock, any, any, any, Document<unknown, any, SlotLock, any, {}> & SlotLock & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SlotLock, Document<unknown, {}, import("mongoose").FlatRecord<SlotLock>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SlotLock> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
