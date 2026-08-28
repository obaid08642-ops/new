import { Document, Types } from 'mongoose';
export type HospitalSubEntityDocument = HospitalSubEntity & Document;
export declare class HospitalSubEntity {
    parent_hospital_id: Types.ObjectId;
    assigned_branch_id: Types.ObjectId;
    sub_entity_user_id: Types.ObjectId;
    entity_type: string;
    is_active: boolean;
    custom_branch_permissions: string[];
}
export declare const HospitalSubEntitySchema: import("mongoose").Schema<HospitalSubEntity, import("mongoose").Model<HospitalSubEntity, any, any, any, Document<unknown, any, HospitalSubEntity, any, {}> & HospitalSubEntity & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HospitalSubEntity, Document<unknown, {}, import("mongoose").FlatRecord<HospitalSubEntity>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HospitalSubEntity> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
