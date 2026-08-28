import { Document } from 'mongoose';
export declare class AmbulanceVehicle {
    id: string;
    provider_account_id: string;
    plate_number: string;
    model?: string;
    year?: number;
    equipment: string[];
    paramedic_count: number;
    has_icu: boolean;
    vehicle_type: string;
    last_location?: {
        lat?: number;
        lng?: number;
        updated_at?: Date;
    };
    base_city?: string;
    documents: string[];
    status: string;
    admin_notes?: string;
    reviewed_by?: string;
    reviewed_at?: Date;
    is_available: boolean;
}
export type AmbulanceVehicleDocument = AmbulanceVehicle & Document;
export declare const AmbulanceVehicleSchema: import("mongoose").Schema<AmbulanceVehicle, import("mongoose").Model<AmbulanceVehicle, any, any, any, Document<unknown, any, AmbulanceVehicle, any, {}> & AmbulanceVehicle & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AmbulanceVehicle, Document<unknown, {}, import("mongoose").FlatRecord<AmbulanceVehicle>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AmbulanceVehicle> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
