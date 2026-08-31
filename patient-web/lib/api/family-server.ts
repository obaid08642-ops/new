import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundaries for family data. */
export function getPatientFamilyMembers(accessToken: string) {
  return callPatientApi("/family/members", {}, accessToken);
}
export function getPatientFamilyGroup(accessToken: string) {
  return callPatientApi("/family/my-group", {}, accessToken);
}
export function getPatientFamilyMemberRecords(accessToken: string, memberId: string) {
  return callPatientApi(`/family/member-records/${encodeURIComponent(memberId)}`, {}, accessToken);
}
export function getPatientFamilyCalendar(accessToken: string) {
  return callPatientApi("/family/calendar", {}, accessToken);
}
