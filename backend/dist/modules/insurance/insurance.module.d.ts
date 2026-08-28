import { Model } from 'mongoose';
import { InsuranceCompany, InsuranceCompanyDocument, InsuranceNetwork, InsuranceNetworkDocument, CoverageRule, CoverageRuleDocument, InsuranceClaimDocument } from '../../schemas/insurance.schema';
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { FacilityDocument } from '../../schemas/facility.schema';
import { AiGatewayService } from '../ai/ai-gateway.service';
export declare class InsuranceService {
    private companyModel;
    private networkModel;
    private ruleModel;
    private providerModel;
    private facilityModel;
    private patientModel;
    private claimModel;
    private readonly ai;
    constructor(companyModel: Model<InsuranceCompanyDocument>, networkModel: Model<InsuranceNetworkDocument>, ruleModel: Model<CoverageRuleDocument>, providerModel: Model<ProviderProfileDocument>, facilityModel: Model<FacilityDocument>, patientModel: Model<any>, claimModel: Model<InsuranceClaimDocument>, ai: AiGatewayService);
    private cleanJson;
    listCompanies(): Promise<any[]>;
    createCompany(data: any): Promise<InsuranceCompany>;
    listAllCompaniesWithNetworks(): Promise<any[]>;
    updateCompany(id: string, allowed: any): Promise<any>;
    deleteNetwork(companyId: string, networkId: string): Promise<any>;
    listNetworks(companyId: string): Promise<InsuranceNetwork[]>;
    createNetwork(companyId: string, data: any): Promise<InsuranceNetwork>;
    listRules(networkId: string): Promise<CoverageRule[]>;
    createRule(networkId: string, data: any): Promise<CoverageRule>;
    checkCoverage(patientId: string, query: {
        provider_id?: string;
        facility_id?: string;
        service_type: string;
        service_key?: string;
    }): Promise<{
        covered: boolean;
        reason: string;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy?: undefined;
        provider_name?: undefined;
        company_id?: undefined;
        company_name_ar?: undefined;
        network_id?: undefined;
        network_name_ar?: undefined;
        class?: undefined;
    } | {
        covered: boolean;
        reason: string;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy: any;
        provider_name?: undefined;
        company_id?: undefined;
        company_name_ar?: undefined;
        network_id?: undefined;
        network_name_ar?: undefined;
        class?: undefined;
    } | {
        covered: boolean;
        provider_name: string;
        company_id: string;
        company_name_ar: string;
        network_id: string;
        network_name_ar: string;
        class: any;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy: any;
        reason?: undefined;
    }>;
    ocrExtract(fileData: any): Promise<{
        success: boolean;
        extracted_data: any;
    }>;
    uploadPolicy(fileData: any, patientId?: string): Promise<{
        success: boolean;
        policy: any;
    }>;
    nphiesEligibility(nationalId: string, companyCode: string, memberId?: string): Promise<{
        eligible: boolean;
        reason: string;
        nphies_live: boolean;
        source?: undefined;
        verified?: undefined;
        network?: undefined;
        network_class?: undefined;
        expiry_date?: undefined;
    } | {
        eligible: boolean;
        source: string;
        nphies_live: boolean;
        verified: boolean;
        network: any;
        network_class: any;
        expiry_date: any;
        reason?: undefined;
    }>;
    savePolicy(patientId: string, policyData: any): Promise<{
        success: boolean;
        insurance: any;
    }>;
    submitClaim(patientId: string, claimData: any): Promise<any>;
    getClaims(patientId: string): Promise<(import("mongoose").FlattenMaps<InsuranceClaimDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class InsuranceController {
    private svc;
    constructor(svc: InsuranceService);
    companies(): Promise<any[]>;
    allCompanies(): Promise<any[]>;
    createCompany(b: any): Promise<InsuranceCompany>;
    updateCompany(id: string, b: any): Promise<any>;
    deleteNetwork(companyId: string, networkId: string): Promise<any>;
    networks(companyId: string): Promise<InsuranceNetwork[]>;
    createNetwork(companyId: string, b: any): Promise<InsuranceNetwork>;
    rules(networkId: string): Promise<CoverageRule[]>;
    createRule(networkId: string, b: any): Promise<CoverageRule>;
    coverageCheck(u: any, providerId?: string, facilityId?: string, serviceType?: string, serviceKey?: string): Promise<{
        covered: boolean;
        reason: string;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy?: undefined;
        provider_name?: undefined;
        company_id?: undefined;
        company_name_ar?: undefined;
        network_id?: undefined;
        network_name_ar?: undefined;
        class?: undefined;
    } | {
        covered: boolean;
        reason: string;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy: any;
        provider_name?: undefined;
        company_id?: undefined;
        company_name_ar?: undefined;
        network_id?: undefined;
        network_name_ar?: undefined;
        class?: undefined;
    } | {
        covered: boolean;
        provider_name: string;
        company_id: string;
        company_name_ar: string;
        network_id: string;
        network_name_ar: string;
        class: any;
        copay_percent: number;
        copay_flat: number;
        requires_preauth: boolean;
        patient_policy: any;
        reason?: undefined;
    }>;
    ocrExtract(body: any): Promise<{
        success: boolean;
        extracted_data: any;
    }>;
    uploadPolicy(u: any, body: any): Promise<{
        success: boolean;
        policy: any;
    }>;
    nphiesEligibility(body: any): Promise<{
        eligible: boolean;
        reason: string;
        nphies_live: boolean;
        source?: undefined;
        verified?: undefined;
        network?: undefined;
        network_class?: undefined;
        expiry_date?: undefined;
    } | {
        eligible: boolean;
        source: string;
        nphies_live: boolean;
        verified: boolean;
        network: any;
        network_class: any;
        expiry_date: any;
        reason?: undefined;
    }>;
    savePolicy(u: any, body: any): Promise<{
        success: boolean;
        insurance: any;
    }>;
    submitClaim(u: any, body: any): Promise<any>;
    getClaims(u: any): Promise<(import("mongoose").FlattenMaps<InsuranceClaimDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class InsuranceModule {
}
