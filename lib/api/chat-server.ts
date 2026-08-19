import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's chat thread list. */
export function getPatientChatThreads(accessToken: string) {
  return callPatientApi("/chat/threads", {}, accessToken);
}
