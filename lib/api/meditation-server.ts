import { callPatientApi } from "@/lib/api/upstream";
export function getPatientMeditationHistory(accessToken:string){return callPatientApi("/mental-health/meditation",{},accessToken);}
