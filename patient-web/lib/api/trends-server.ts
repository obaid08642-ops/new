import { callPatientApi } from "@/lib/api/upstream";
export function getPatientHealthTrends(accessToken:string){return callPatientApi("/health/trends",{},accessToken);}
