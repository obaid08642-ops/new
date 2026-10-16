/**
 * Shapes of the chat service (backend/src/modules/chat): `GET /chat/threads` answers `{ threads, total }`,
 * `GET /chat/threads/:id/messages` answers `{ messages (newest first), has_more }`, a message carries `sender_id`,
 * `body`, `type`, `createdAt`. The provider chat screen used to read the whole response as an array of
 * `{ sender: 'me', text, time }`, which does not exist: opening any conversation crashed.
 */
export interface ChatListItem { id: string; name: string; lastMsg: string; time: string; unread: number }
export interface ChatBubble { id: string; sender: 'me' | 'them'; text: string; type: 'text' | 'image' | 'file' | 'voice' | 'system'; time: string }

const KIND_LABEL: Record<string, [string, string]> = {
  consultation: ['استشارة', 'Consultation'],
  lab: ['مختبر', 'Lab'],
  radiology: ['أشعة', 'Radiology'],
  nursing: ['رعاية منزلية', 'Home care'],
  home_care: ['رعاية منزلية', 'Home care'],
  pharmacy: ['صيدلية', 'Pharmacy'],
};

const asArray = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function stamp(value: unknown, ar: boolean): string {
  const d = new Date(String(value || ''));
  if (Number.isNaN(d.getTime())) return '';
  const locale = ar ? 'ar-SA-u-ca-gregory' : 'en-GB';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function mapThreads(data: unknown, me: string, ar: boolean): ChatListItem[] {
  const list = asArray((data as { threads?: unknown } | null)?.threads ?? data);
  return list.filter(t => typeof t.id === 'string').map(t => {
    const id = String(t.id);
    const kind = KIND_LABEL[str(t.booking_kind)];
    const name = str(t.name) || `${kind ? kind[ar ? 0 : 1] : (ar ? 'محادثة' : 'Chat')} #${(str(t.booking_id) || id).slice(-4)}`;
    const counts = (t.unread_counts && typeof t.unread_counts === 'object' ? t.unread_counts : {}) as Record<string, unknown>;
    return { id, name, lastMsg: str(t.last_message), time: stamp(t.last_message_at, ar), unread: Number(counts[me]) || 0 };
  });
}

export function mapMessages(data: unknown, me: string, ar: boolean): ChatBubble[] {
  const list = asArray((data as { messages?: unknown } | null)?.messages ?? data);
  const out = list.filter(m => typeof m.id === 'string').map((m): ChatBubble => {
    const type = (['image', 'file', 'voice', 'system'].includes(str(m.type)) ? str(m.type) : 'text') as ChatBubble['type'];
    const text = str(m.body) || str(m.attachment_name) || (type === 'voice' ? (ar ? 'رسالة صوتية' : 'Voice message') : '');
    return { id: String(m.id), sender: str(m.sender_id) === me ? 'me' : 'them', text, type, time: stamp(m.createdAt, ar) };
  });
  return out.reverse(); // the server answers newest first; the room reads oldest first
}
