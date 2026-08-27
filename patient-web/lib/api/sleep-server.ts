import { callPatientApi } from "@/lib/api/upstream";
export function getPatientSleepReadings(accessToken:string){return callPatientApi("/health/sleep?limit=100",{},accessToken);}
