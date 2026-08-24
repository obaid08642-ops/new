import { callPatientApi } from "@/lib/api/upstream";
export function getPatientEmergencyContacts(accessToken:string){return callPatientApi("/health/emergency-contacts",{},accessToken);}
