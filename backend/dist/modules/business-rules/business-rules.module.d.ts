import { Model } from 'mongoose';
import { ServiceDomain } from '../../common/enums';
export type RuleContext = {
    kind: ServiceDomain;
    patient?: {
        id?: string;
        age?: number;
        sex?: 'male' | 'female';
        chronic?: string[];
    };
    insurance?: {
        provider?: string;
        policy_number?: string;
        eligible_services?: string[];
    };
    service?: {
        id?: string;
        key?: string;
        price?: number;
        min_age?: number;
        max_age?: number;
        sex_restriction?: 'male' | 'female';
    };
    provider?: {
        id?: string;
        user_id?: string;
        type?: string;
        accepted_insurance?: string[];
        capabilities?: string[];
    };
    scheduled_at?: string | Date;
    location?: {
        lat?: number;
        lng?: number;
        city?: string;
    };
    payment_method?: 'cash' | 'card' | 'insurance';
    service_context?: 'home_visit' | 'online_consultation' | 'in_clinic' | 'pharmacy_delivery';
};
export type RuleResult = {
    ok: boolean;
    final_price?: number;
    base_price?: number;
    tax?: number;
    insurance_discount?: number;
    surge_multiplier?: number;
    errors: string[];
    warnings: string[];
    meta: Record<string, any>;
};
export declare class BusinessRulesService {
    private providers;
    constructor(providers: Model<any>);
    private surgeConfig;
    getSurgeConfig(): {
        startHour: number;
        endHour: number;
        multiplier: number;
    };
    updateSurgeConfig(config: any): {
        startHour: number;
        endHour: number;
        multiplier: number;
    };
    private validateInsurance;
    private validateEligibility;
    private validateProviderAcceptance;
    private computePricing;
    private validatePaymentMethod;
    validate(ctx: RuleContext): Promise<RuleResult>;
}
export declare class BusinessRulesController {
    private svc;
    constructor(svc: BusinessRulesService);
    getSurge(): {
        startHour: number;
        endHour: number;
        multiplier: number;
    };
    updateSurge(body: any): {
        startHour: number;
        endHour: number;
        multiplier: number;
    };
    validate(ctx: RuleContext): Promise<RuleResult>;
}
export declare class BusinessRulesModule {
}
