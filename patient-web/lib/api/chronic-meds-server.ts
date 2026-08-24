import { callPatientApi } from "@/lib/api/upstream";
export function getPatientChronicMedications(accessToken:string){return callPatientApi("/health/chronic-meds",{},accessToken);}
