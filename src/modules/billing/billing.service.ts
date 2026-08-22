import { Injectable } from '@nestjs/common';
import { ProviderType } from '../../common/enums';

export interface CommissionBreakdown {
  providerBaseAmount: number;
  nabdahCommissionAmount: number;
  nabdahVatAmount: number;
  totalPatientBilled: number;
  commissionRate: number;
  vatRate: number;
}

@Injectable()
export class BillingService {
  private readonly VAT_RATE = 0.15; // 15% KSA VAT on commission

  calculateCommission(
    baseAmount: number,
    providerType: string,
    surgeMultiplier: number = 1.0
  ): CommissionBreakdown {
    let commissionRate = 0;

    switch (providerType) {
      case ProviderType.DOCTOR:
      case ProviderType.HOSPITAL:
      case ProviderType.CLINIC:
        commissionRate = 0.15; // 15%
        break;
      case ProviderType.HOME_CARE:
      case ProviderType.NURSING:
        commissionRate = 0.10; // 10%
        break;
      case ProviderType.PHARMACY:
        commissionRate = 0.05; // 5%
        break;
      case ProviderType.LAB:
      case ProviderType.RADIOLOGY:
        commissionRate = 0.10; // Assume 10% for diagnostics if not specified
        break;
      default:
        commissionRate = 0.10; // Default fallback
        break;
    }

    // Apply Surge Multiplier (if enabled, default 1.0)
    const finalAmount = baseAmount * surgeMultiplier;

    const nabdahCommissionAmount = finalAmount * commissionRate;
    const nabdahVatAmount = nabdahCommissionAmount * this.VAT_RATE;
    
    // Nabdah deducts its commission + VAT on that commission from the total.
    // So patient pays the total (finalAmount), and provider gets: 
    // providerBaseAmount = finalAmount - (nabdahCommissionAmount + nabdahVatAmount)
    const providerBaseAmount = finalAmount - nabdahCommissionAmount - nabdahVatAmount;

    return {
      providerBaseAmount: parseFloat(providerBaseAmount.toFixed(2)),
      nabdahCommissionAmount: parseFloat(nabdahCommissionAmount.toFixed(2)),
      nabdahVatAmount: parseFloat(nabdahVatAmount.toFixed(2)),
      totalPatientBilled: parseFloat(finalAmount.toFixed(2)),
      commissionRate,
      vatRate: this.VAT_RATE,
    };
  }
}
