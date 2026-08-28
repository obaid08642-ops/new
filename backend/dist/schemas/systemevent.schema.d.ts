import { Document, Types } from 'mongoose';
export declare class SystemEvent extends Document {
    eventType: string;
    type: string;
    payload: Record<string, any>;
    source: string;
    status: string;
    entity_type: string;
    entity_id: string;
    actor_account_id: string;
}
export declare const SystemEventSchema: import("mongoose").Schema<SystemEvent, import("mongoose").Model<SystemEvent, any, any, any, Document<unknown, any, SystemEvent, any, {}> & SystemEvent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SystemEvent, Document<unknown, {}, import("mongoose").FlatRecord<SystemEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SystemEvent> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
