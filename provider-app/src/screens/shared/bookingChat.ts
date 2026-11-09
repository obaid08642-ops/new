// The provider's chat with the patient of one booking (lab, radiology): the backend opens or finds the booking thread
// (POST /chats/threads/booking, chat.service.ts BOOKING_KINDS) and the messages live on /chats/threads/:id/messages.
export type BookingChatKind = 'lab' | 'radiology' | 'nursing';
export const BOOKING_THREAD_URL = '/chats/threads/booking';
export const messagesUrl = (threadId: string) => `/chats/threads/${encodeURIComponent(threadId)}/messages`;

export function threadBody(kind: BookingChatKind, order: any): { booking_kind: BookingChatKind; booking_id: string } | null {
  const id = order?.id || order?.raw?.id || order?.booking_id;
  return id ? { booking_kind: kind, booking_id: String(id) } : null;
}

/** The thread id from the get-or-create answer (the server answers the thread itself or {thread}). */
export function threadIdOf(data: any): string | null {
  const id = data?.id || data?.thread?.id;
  return id ? String(id) : null;
}

/** The server lists newest first; the screen shows oldest first. */
export function orderedMessages(data: any): any[] {
  return (Array.isArray(data?.messages) ? data.messages : []).slice().reverse();
}

export function sendBody(text: string, now: number = Date.now()): { body: string; client_message_id: string } | null {
  const body = (text ?? '').trim();
  return body ? { body, client_message_id: `p_${now}` } : null;
}
