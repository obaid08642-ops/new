import { Document } from 'mongoose';
import { EmergencyState } from '../common/enums';
export declare class EmergencyRequest {
    id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    location?: {
        lat?: number;
        lng?: number;
        address?: string;
    };
    symptoms?: string;
    severity: string;
    state: EmergencyState;
    assigned_hospital_id?: string;
    assigned_ambulance_id?: string;
    assigned_provider_id?: string;
    unit_label?: string;
    paramedic_name?: string;
    claimed_at?: Date;
    unit_location?: {
        lat?: number;
        lng?: number;
        updated_at?: Date;
    };
    admin_notes?: string;
    resolved_at?: Date;
    resolved_by?: string;
    state_history: {
        from: string;
        to: string;
        by: string;
        at: Date;
    }[];
}
export type EmergencyRequestDocument = EmergencyRequest & Document;
export declare const EmergencyRequestSchema: import("mongoose").Schema<EmergencyRequest, import("mongoose").Model<EmergencyRequest, any, any, any, Document<unknown, any, EmergencyRequest, any, {}> & EmergencyRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EmergencyRequest, Document<unknown, {}, import("mongoose").FlatRecord<EmergencyRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EmergencyRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
