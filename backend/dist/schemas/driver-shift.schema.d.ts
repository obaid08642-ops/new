import { Document } from 'mongoose';
export declare class DriverShift {
    id: string;
    driver_id: string;
    status: string;
    started_at: Date;
    ended_at?: Date;
    current_location?: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
        at?: Date;
    };
    deliveries_completed: number;
    earnings: number;
}
export type DriverShiftDocument = DriverShift & Document;
export declare const DriverShiftSchema: import("mongoose").Schema<DriverShift, import("mongoose").Model<DriverShift, any, any, any, Document<unknown, any, DriverShift, any, {}> & DriverShift & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DriverShift, Document<unknown, {}, import("mongoose").FlatRecord<DriverShift>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DriverShift> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
