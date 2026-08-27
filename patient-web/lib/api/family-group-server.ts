import { callPatientApi } from "@/lib/api/upstream";
export function getPatientFamilyGroup(accessToken:string){return callPatientApi("/family/my-group",{},accessToken);}
