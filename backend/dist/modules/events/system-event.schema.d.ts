import { Document } from 'mongoose';
export declare class SystemEvent extends Document {
    id: string;
    type: string;
    entity_type: string;
    entity_id: string;
    idempotency_key?: string;
    actor_account_id?: string;
    actor_role?: string;
    reason_code?: string;
    patient_account_id?: string;
    pharmacy_account_id?: string;
    before?: any;
    after?: any;
    meta?: any;
}
export declare const SystemEventSchema: import("mongoose").Schema<SystemEvent, import("mongoose").Model<SystemEvent, any, any, any, Document<unknown, any, SystemEvent, any, {}> & SystemEvent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SystemEvent, Document<unknown, {}, import("mongoose").FlatRecord<SystemEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SystemEvent> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
