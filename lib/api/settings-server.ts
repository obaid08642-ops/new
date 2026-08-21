import { callPatientApi } from "@/lib/api/upstream";

export function getPatientPrivacySettings(accessToken: string) {
  return callPatientApi("/users/me/privacy-settings", {}, accessToken);
}

export function getPatientSecuritySettings(accessToken: string) {
  return callPatientApi("/users/me/security-settings", {}, accessToken);
}

export function getPatientStorage(accessToken: string) {
  return callPatientApi("/users/me/storage", {}, accessToken);
}
