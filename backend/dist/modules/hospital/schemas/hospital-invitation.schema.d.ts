import { Document } from 'mongoose';
export type HospitalInvitationDocument = HospitalInvitation & Document;
export declare class HospitalInvitation {
    id: string;
    facility_id: string;
    invitee_id: string;
    invitee_identifier: string;
    role: string;
    permissions: Record<string, boolean>;
    status: string;
    responded_at?: Date;
}
export declare const HospitalInvitationSchema: import("mongoose").Schema<HospitalInvitation, import("mongoose").Model<HospitalInvitation, any, any, any, Document<unknown, any, HospitalInvitation, any, {}> & HospitalInvitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HospitalInvitation, Document<unknown, {}, import("mongoose").FlatRecord<HospitalInvitation>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HospitalInvitation> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
