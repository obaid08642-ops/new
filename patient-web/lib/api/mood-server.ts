import { callPatientApi } from "@/lib/api/upstream";
export function getPatientMoodHistory(accessToken:string){return callPatientApi("/mental-health/mood?days=30",{},accessToken);}
