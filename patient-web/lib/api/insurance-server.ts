import { callPatientApi } from "@/lib/api/upstream";
export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }
export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }
export function getPatientInsuranceRequest(accessToken: string, requestId: string) { return callPatientApi(`/insurance/requests/${requestId}`, {}, accessToken); }
