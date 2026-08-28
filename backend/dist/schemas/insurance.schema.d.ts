import { Document } from 'mongoose';
export declare class InsuranceNetworkContract {
    company_id: string;
    company_name_ar: string;
    company_name_en: string;
    network_id: string;
    network_name_ar: string;
    network_name_en: string;
    covered_classes: string[];
    copay_percent: number;
    copay_flat: number;
}
export declare const InsuranceNetworkContractSchema: import("mongoose").Schema<InsuranceNetworkContract, import("mongoose").Model<InsuranceNetworkContract, any, any, any, Document<unknown, any, InsuranceNetworkContract, any, {}> & InsuranceNetworkContract & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceNetworkContract, Document<unknown, {}, import("mongoose").FlatRecord<InsuranceNetworkContract>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceNetworkContract> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class InsuranceCompany {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    logo_url?: string;
    logo_source_url?: string;
    logo_sha256?: string;
    logo_verified_at?: Date;
    regulatory_source_url?: string;
    entity_type: string;
    catalog_status: string;
    provenance?: string;
    catalog_version: number;
    superseded_by_company_id?: string;
    retired_at?: Date;
    is_active: boolean;
}
export type InsuranceCompanyDocument = InsuranceCompany & Document;
export declare const InsuranceCompanySchema: import("mongoose").Schema<InsuranceCompany, import("mongoose").Model<InsuranceCompany, any, any, any, Document<unknown, any, InsuranceCompany, any, {}> & InsuranceCompany & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceCompany, Document<unknown, {}, import("mongoose").FlatRecord<InsuranceCompany>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceCompany> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class InsuranceNetwork {
    id: string;
    company_id: string;
    code: string;
    name_ar: string;
    name_en: string;
    tier_level: number;
    source_url?: string;
    source_label?: string;
    verified_at?: Date;
    catalog_status: string;
    provenance?: string;
    retired_at?: Date;
}
export type InsuranceNetworkDocument = InsuranceNetwork & Document;
export declare const InsuranceNetworkSchema: import("mongoose").Schema<InsuranceNetwork, import("mongoose").Model<InsuranceNetwork, any, any, any, Document<unknown, any, InsuranceNetwork, any, {}> & InsuranceNetwork & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceNetwork, Document<unknown, {}, import("mongoose").FlatRecord<InsuranceNetwork>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceNetwork> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class CoverageRule {
    id: string;
    network_id: string;
    service_type: string;
    service_key?: string;
    copay_percent: number;
    copay_flat_limit: number;
    requires_preauth: boolean;
    max_annual_limit?: number;
}
export type CoverageRuleDocument = CoverageRule & Document;
export declare const CoverageRuleSchema: import("mongoose").Schema<CoverageRule, import("mongoose").Model<CoverageRule, any, any, any, Document<unknown, any, CoverageRule, any, {}> & CoverageRule & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CoverageRule, Document<unknown, {}, import("mongoose").FlatRecord<CoverageRule>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CoverageRule> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class InsuranceClaim {
    id: string;
    patient_id: string;
    service: string;
    amount: number;
    covered: number;
    status: string;
    date: string;
}
export type InsuranceClaimDocument = InsuranceClaim & Document;
export declare const InsuranceClaimSchema: import("mongoose").Schema<InsuranceClaim, import("mongoose").Model<InsuranceClaim, any, any, any, Document<unknown, any, InsuranceClaim, any, {}> & InsuranceClaim & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceClaim, Document<unknown, {}, import("mongoose").FlatRecord<InsuranceClaim>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceClaim> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class InsuranceDetails {
    company_name_ar?: string;
    company_name_en?: string;
    category?: string;
    policyNumber: string;
    memberId: string;
    approvalReferenceNumber?: string;
    approvalStatus: string;
    approvalDate?: Date;
    approvedBy?: string;
    coveredAmount?: number;
    copayAmount?: number;
    coveragePercentage?: number;
    patientCopayPercentage?: number;
    insuranceCompanyShare?: number;
    patientShare?: number;
    rejectionReason?: string;
}
export declare const InsuranceDetailsSchema: import("mongoose").Schema<InsuranceDetails, import("mongoose").Model<InsuranceDetails, any, any, any, Document<unknown, any, InsuranceDetails, any, {}> & InsuranceDetails & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceDetails, Document<unknown, {}, import("mongoose").FlatRecord<InsuranceDetails>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceDetails> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
