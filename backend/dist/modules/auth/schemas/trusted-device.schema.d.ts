import { Document } from 'mongoose';
export type TrustedDeviceDocument = TrustedDevice & Document;
export declare class TrustedDevice {
    id: string;
    user_id: string;
    token_hash: string;
    name?: string;
    user_agent?: string;
    ip?: string;
    last_ip?: string;
    last_seen_at: Date;
    revoked: boolean;
    created_at?: Date;
}
export declare const TrustedDeviceSchema: import("mongoose").Schema<TrustedDevice, import("mongoose").Model<TrustedDevice, any, any, any, Document<unknown, any, TrustedDevice, any, {}> & TrustedDevice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TrustedDevice, Document<unknown, {}, import("mongoose").FlatRecord<TrustedDevice>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<TrustedDevice> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
