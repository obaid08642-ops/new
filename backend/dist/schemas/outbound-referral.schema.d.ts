import { Document } from 'mongoose';
export declare class OutboundReferral extends Document {
    id: string;
    referrer_doctor_id: string;
    patient_id: string;
    referral_code: string;
    target_type: string;
    notes?: string;
    requested_tests: string[];
    status: string;
}
export type OutboundReferralDocument = OutboundReferral & Document;
export declare const OutboundReferralSchema: import("mongoose").Schema<OutboundReferral, import("mongoose").Model<OutboundReferral, any, any, any, Document<unknown, any, OutboundReferral, any, {}> & OutboundReferral & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OutboundReferral, Document<unknown, {}, import("mongoose").FlatRecord<OutboundReferral>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OutboundReferral> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
