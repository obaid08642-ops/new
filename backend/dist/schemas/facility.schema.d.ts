import { Document } from 'mongoose';
import { FacilityType } from '../common/enums';
import { InsuranceNetworkContract } from './insurance.schema';
export declare class Facility {
    id: string;
    parent_facility_id?: string;
    name_ar: string;
    name_en?: string;
    type: FacilityType;
    description_ar?: string;
    description_en?: string;
    city?: string;
    district?: string;
    address?: string;
    location?: {
        lat: number;
        lng: number;
    };
    logo_url?: string;
    images: string[];
    phone?: string;
    whatsapp?: string;
    website?: string;
    email?: string;
    departments: string[];
    accepted_insurance: string[];
    accepts_insurance: boolean;
    insurance_contracts: InsuranceNetworkContract[];
    working_hours: {
        day: string;
        open: string;
        close: string;
        closed?: boolean;
    }[];
    rating: number;
    reviews_count: number;
    is_active: boolean;
    public_eligibility: boolean;
    indexing_eligibility: boolean;
    medical_review_status: string;
    last_reviewed?: Date;
    provenance?: string;
}
export type FacilityDocument = Facility & Document;
export declare const FacilitySchema: import("mongoose").Schema<Facility, import("mongoose").Model<Facility, any, any, any, Document<unknown, any, Facility, any, {}> & Facility & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Facility, Document<unknown, {}, import("mongoose").FlatRecord<Facility>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Facility> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
