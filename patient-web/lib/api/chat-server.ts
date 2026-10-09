import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for one booking thread and its messages (decision 24: there is no thread list). */
export function getPatientChatThread(accessToken: string, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");
  return callPatientApi(`/chat/threads/${threadId}`, {}, accessToken);
}
/** The server's rules for one consultation thread (decision 24): who may chat, upload, call, and when it is read-only. */
export function getPatientChatPermissions(accessToken: string, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");
  return callPatientApi(`/chat/threads/${threadId}/permissions`, {}, accessToken);
}
export function getPatientChatMessages(accessToken: string, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");
  return callPatientApi(`/chat/threads/${threadId}/messages?limit=50`, {}, accessToken);
}
