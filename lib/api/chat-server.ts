import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the current patient's chat thread list. */
export function getPatientChatThreads(accessToken: string) {
  return callPatientApi("/chat/threads", {}, accessToken);
}
export function getPatientChatThread(accessToken: string, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");
  return callPatientApi(`/chat/threads/${threadId}`, {}, accessToken);
}
export function getPatientChatMessages(accessToken: string, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");
  return callPatientApi(`/chat/threads/${threadId}/messages?limit=50`, {}, accessToken);
}
