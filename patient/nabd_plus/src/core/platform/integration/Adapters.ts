import { logger } from '../../../services/Logger';

// ---------------------------------------------------------
// SMS Provider Interface
// ---------------------------------------------------------
export interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<boolean>;
  verifyOTP(phone: string, code: string): Promise<boolean>;
}

// ---------------------------------------------------------
// Maps & Routing Provider Interface
// ---------------------------------------------------------
export interface MapsProvider {
  getDistanceMatrix(origins: string[], destinations: string[]): Promise<any>;
  getRoutePath(startCoords: any, endCoords: any): Promise<any>;
}

// ---------------------------------------------------------
// AI Provider Interface
// ---------------------------------------------------------
export interface AIProvider {
  analyzeSymptomText(text: string): Promise<any>;
  extractDataFromOCR(imageUrl: string): Promise<any>;
}

// ---------------------------------------------------------
// Insurance Verification Provider Interface
// ---------------------------------------------------------
export interface InsuranceProvider {
  verifyPolicy(policyNumber: string, patientId: string): Promise<{ isValid: boolean; coverageDetails: any }>;
  submitClaim(claimData: any): Promise<{ claimId: string; status: string }>;
}
