import { Document, Types } from 'mongoose';
export type SystemConfigExtendedDocument = SystemConfigExtended & Document;
export declare class SystemConfigExtended {
    config_key: string;
    config_value_matrix: Record<string, any>;
    last_modified_by_admin_id: Types.ObjectId;
}
export declare const SystemConfigExtendedSchema: import("mongoose").Schema<SystemConfigExtended, import("mongoose").Model<SystemConfigExtended, any, any, any, Document<unknown, any, SystemConfigExtended, any, {}> & SystemConfigExtended & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SystemConfigExtended, Document<unknown, {}, import("mongoose").FlatRecord<SystemConfigExtended>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SystemConfigExtended> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
