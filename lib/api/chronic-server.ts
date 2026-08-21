import { callPatientApi } from "@/lib/api/upstream";
export function getPatientChronicDiseases(accessToken:string){return callPatientApi("/health/chronic-diseases",{},accessToken);}
