import { Document, Types } from 'mongoose';
export type MaternityProfileDocument = MaternityProfile & Document;
export declare class Checkup {
    week: string;
    name: string;
    done: boolean;
}
export declare const CheckupSchema: import("mongoose").Schema<Checkup, import("mongoose").Model<Checkup, any, any, any, Document<unknown, any, Checkup, any, {}> & Checkup & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Checkup, Document<unknown, {}, import("mongoose").FlatRecord<Checkup>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Checkup> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class KickLog {
    id: Types.ObjectId;
    count: number;
    duration_seconds: number;
    date: Date;
}
export declare const KickLogSchema: import("mongoose").Schema<KickLog, import("mongoose").Model<KickLog, any, any, any, Document<unknown, any, KickLog, any, {}> & KickLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, KickLog, Document<unknown, {}, import("mongoose").FlatRecord<KickLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<KickLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class ContractionLog {
    id: Types.ObjectId;
    interval_seconds: number;
    duration_seconds: number;
    date: Date;
}
export declare const ContractionLogSchema: import("mongoose").Schema<ContractionLog, import("mongoose").Model<ContractionLog, any, any, any, Document<unknown, any, ContractionLog, any, {}> & ContractionLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ContractionLog, Document<unknown, {}, import("mongoose").FlatRecord<ContractionLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ContractionLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class InfantGrowthLog {
    id: Types.ObjectId;
    month: number;
    weight_kg: number;
    height_cm: number;
    head_circ_cm: number;
    date: Date;
}
export declare const InfantGrowthLogSchema: import("mongoose").Schema<InfantGrowthLog, import("mongoose").Model<InfantGrowthLog, any, any, any, Document<unknown, any, InfantGrowthLog, any, {}> & InfantGrowthLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InfantGrowthLog, Document<unknown, {}, import("mongoose").FlatRecord<InfantGrowthLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InfantGrowthLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MaternityProfile {
    patient_id: string;
    is_pregnant?: boolean;
    due_date: Date;
    last_period_date: Date;
    prev_period_date: Date;
    cycle_length?: number;
    is_regular?: boolean;
    current_week?: number;
    checkups: Checkup[];
    kicks_log: KickLog[];
    contractions_log: ContractionLog[];
    infant_growth: InfantGrowthLog[];
}
export declare const MaternityProfileSchema: import("mongoose").Schema<MaternityProfile, import("mongoose").Model<MaternityProfile, any, any, any, Document<unknown, any, MaternityProfile, any, {}> & MaternityProfile & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MaternityProfile, Document<unknown, {}, import("mongoose").FlatRecord<MaternityProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MaternityProfile> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
