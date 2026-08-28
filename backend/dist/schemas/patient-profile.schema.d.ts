import { Document } from 'mongoose';
export declare class PatientProfile {
    id: string;
    user_id: string;
    age?: number;
    gender?: string;
    blood_type?: string;
    weight?: number;
    height?: number;
    allergies: string[];
    chronic_diseases: string[];
    current_medications: string[];
    emergency_contacts: {
        id?: string;
        name: string;
        phone: string;
        relation: string;
        isPrimary?: boolean;
    }[];
    full_name?: string;
    phone?: string;
    email?: string;
    dob?: string;
    national_id?: string;
    notification_settings?: Record<string, any>;
    privacy_settings?: Record<string, any>;
    security_settings?: Record<string, any>;
    addresses: {
        id: string;
        label: string;
        street: string;
        city: string;
        lat?: number;
        lng?: number;
        is_default?: boolean;
    }[];
    insurance?: {
        provider: string;
        policy_number: string;
        network: string;
        class?: string;
        expiry_date?: string;
        member_name?: string;
        national_id?: string;
        verified?: boolean;
        pdf_url?: string;
        ocr_extracted?: boolean;
        nphies_eligible?: boolean;
    };
}
export type PatientProfileDocument = PatientProfile & Document;
export declare const PatientProfileSchema: import("mongoose").Schema<PatientProfile, import("mongoose").Model<PatientProfile, any, any, any, Document<unknown, any, PatientProfile, any, {}> & PatientProfile & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PatientProfile, Document<unknown, {}, import("mongoose").FlatRecord<PatientProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PatientProfile> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
