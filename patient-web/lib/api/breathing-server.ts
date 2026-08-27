import { callPatientApi } from "@/lib/api/upstream";
export function getPatientBreathingHistory(accessToken:string){return callPatientApi("/mental-health/breathing",{},accessToken);}
