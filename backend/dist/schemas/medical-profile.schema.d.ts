import { Document } from 'mongoose';
export declare enum BloodType {
    A_POS = "A+",
    A_NEG = "A-",
    B_POS = "B+",
    B_NEG = "B-",
    AB_POS = "AB+",
    AB_NEG = "AB-",
    O_POS = "O+",
    O_NEG = "O-",
    UNKNOWN = "unknown"
}
export declare class MedicalProfile extends Document {
    id: string;
    patient_id: string;
    blood_type?: string;
    height_cm?: number;
    weight_kg?: number;
    birth_date?: Date;
    gender: string;
    is_pregnant: boolean;
    pregnancy_weeks?: number;
    is_breastfeeding: boolean;
    is_smoker: boolean;
    drinks_alcohol: boolean;
    chronic_diseases: any[];
    allergies: any[];
    surgeries: any[];
    long_term_medications: any[];
    family_history: any[];
    emergency_contact?: {
        name?: string;
        phone?: string;
        relation?: string;
    };
    notes?: string;
    last_updated_at?: Date;
    last_updated_by_id?: string;
}
export declare const MedicalProfileSchema: import("mongoose").Schema<MedicalProfile, import("mongoose").Model<MedicalProfile, any, any, any, Document<unknown, any, MedicalProfile, any, {}> & MedicalProfile & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicalProfile, Document<unknown, {}, import("mongoose").FlatRecord<MedicalProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicalProfile> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
