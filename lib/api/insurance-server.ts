import { callPatientApi } from "@/lib/api/upstream";
export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }
export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }
