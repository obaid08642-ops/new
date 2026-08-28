import { callPatientApi } from "@/lib/api/upstream";
export function getPatientWellbeingDashboard(accessToken: string) { return callPatientApi("/mental-health/dashboard", {}, accessToken); }
