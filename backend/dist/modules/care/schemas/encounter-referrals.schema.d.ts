import { Document, Types } from 'mongoose';
export declare class EncounterReferral {
    appointment_id: Types.ObjectId;
    patient_id: Types.ObjectId;
    doctor_id: Types.ObjectId;
    requested_lab_tests: string[];
    requested_radiology_scans: string[];
    home_care_recommendation_notes: string;
    diagnostic_results_returned: boolean;
    returned_results_file_urls: string[];
    prescription_routing_status: string;
}
export declare const EncounterReferralSchema: import("mongoose").Schema<EncounterReferral, import("mongoose").Model<EncounterReferral, any, any, any, Document<unknown, any, EncounterReferral, any, {}> & EncounterReferral & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EncounterReferral, Document<unknown, {}, import("mongoose").FlatRecord<EncounterReferral>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EncounterReferral> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
