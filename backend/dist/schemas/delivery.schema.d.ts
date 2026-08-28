import { Document } from 'mongoose';
import { DeliveryState } from '../common/enums';
export declare class Delivery {
    id: string;
    order_id: string;
    pharmacy_id?: string;
    driver_id?: string;
    state: DeliveryState;
    pickup?: any;
    dropoff?: any;
    current_location?: any;
    attempts: number;
    eta_minutes?: number;
    fee?: number;
    notes?: string;
    signature?: string;
    photo_proof?: string;
    delivered_at?: Date;
}
export type DeliveryDocument = Delivery & Document;
export declare const DeliverySchema: import("mongoose").Schema<Delivery, import("mongoose").Model<Delivery, any, any, any, Document<unknown, any, Delivery, any, {}> & Delivery & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Delivery, Document<unknown, {}, import("mongoose").FlatRecord<Delivery>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Delivery> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
