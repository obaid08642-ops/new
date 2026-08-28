import { Document } from 'mongoose';
export type HeatmapDataDocument = HeatmapData & Document;
export declare class HeatmapData {
    clusterId: string;
    latitude: number;
    longitude: number;
    intensity: number;
    type: string;
}
export declare const HeatmapDataSchema: import("mongoose").Schema<HeatmapData, import("mongoose").Model<HeatmapData, any, any, any, Document<unknown, any, HeatmapData, any, {}> & HeatmapData & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HeatmapData, Document<unknown, {}, import("mongoose").FlatRecord<HeatmapData>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HeatmapData> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
