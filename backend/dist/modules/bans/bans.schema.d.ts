import { Document } from 'mongoose';
export type BanDocument = Ban & Document;
export declare class Ban {
    id: string;
    type: string;
    value: string;
    reason: string;
    banned_by_admin_id: string;
    expires_at: Date;
    is_active: boolean;
}
export declare const BanSchema: import("mongoose").Schema<Ban, import("mongoose").Model<Ban, any, any, any, Document<unknown, any, Ban, any, {}> & Ban & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Ban, Document<unknown, {}, import("mongoose").FlatRecord<Ban>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Ban> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
