import { Document } from 'mongoose';
export type ProviderBranchDocument = ProviderBranch & Document;
export declare class ProviderBranch {
    _id: string;
    parent_hospital_id: string;
    branch_name_ar: string;
    branch_name_en: string;
    city: string;
    district: string;
    location: {
        lat: number;
        lng: number;
    };
    doctors_roster: string[];
}
export declare const ProviderBranchSchema: import("mongoose").Schema<ProviderBranch, import("mongoose").Model<ProviderBranch, any, any, any, Document<unknown, any, ProviderBranch, any, {}> & ProviderBranch & Required<{
    _id: string;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderBranch, Document<unknown, {}, import("mongoose").FlatRecord<ProviderBranch>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderBranch> & Required<{
    _id: string;
}> & {
    __v: number;
}>;
