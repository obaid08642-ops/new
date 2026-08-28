export interface CommissionBreakdown {
    providerBaseAmount: number;
    nabdahCommissionAmount: number;
    nabdahVatAmount: number;
    totalPatientBilled: number;
    commissionRate: number;
    vatRate: number;
}
export declare class BillingService {
    private readonly VAT_RATE;
    calculateCommission(baseAmount: number, providerType: string, surgeMultiplier?: number): CommissionBreakdown;
}
