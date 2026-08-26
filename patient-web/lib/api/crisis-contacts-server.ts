import { callPatientApi } from "@/lib/api/upstream";
export function getPatientCrisisContacts(accessToken:string){return callPatientApi("/mental-health/crisis-contacts",{},accessToken);}
