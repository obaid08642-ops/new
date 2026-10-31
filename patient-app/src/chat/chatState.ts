/**
 * The state of a chat thread on the device, as pure functions: no duplicates when the socket echoes a message the device
 * already shows, who wrote a message, and the sent / delivered / read ticks. The thread is between two people, so a message is
 * delivered or read once anyone other than its sender is in `delivered_to` / `read_by`.
 */
export type Tick = 'sent' | 'delivered' | 'read';
export type MsgKind = 'text' | 'image' | 'file' | 'voice';

export interface ChatMsg {
  id: string;
  sender: 'me' | 'doc';
  text: string;
  time: string;
  /** createdAt in ms, for ordering and for "read up to here" state events */
  at: number;
  kind?: MsgKind;
  mediaId?: string;
  pending?: boolean;
  failed?: boolean;
  /** the id the device chose for this send; the server stores it, so a retry never creates a second message */
  clientId?: string;
  tick?: Tick;
  /** queued without a connection; sent when the connection returns */
  queued?: boolean;
}

export interface ServerMsg {
  id?: string;
  _id?: string;
  msg_id?: string;
  thread_id?: string;
  sender_id?: string;
  sender_role?: string;
  body?: string;
  content?: string;
  text?: string;
  type?: string;
  media_ids?: string[];
  createdAt?: string;
  created_at?: string;
  client_message_id?: string;
  delivered_to?: string[];
  read_by?: string[];
}

export interface StateEvent {
  kind?: 'delivered' | 'read' | 'deleted';
  thread_id?: string;
  user_id?: string;
  msg_id?: string;
  at?: string | number;
}

export const kindOf = (type?: string): MsgKind => (type === 'image' || type === 'file' || type === 'voice' ? type : 'text');

export const isOwn = (m: ServerMsg, myId?: string): boolean => {
  if (myId && m.sender_id) return m.sender_id === myId;
  return !(m.sender_role === 'provider' || m.sender_role === 'doctor');
};

export function tickOf(m: ServerMsg): Tick {
  const others = (ids?: string[]) => (ids ?? []).some((id) => id !== m.sender_id);
  if (others(m.read_by)) return 'read';
  if (others(m.delivered_to)) return 'delivered';
  return 'sent';
}

export function fromServer(m: ServerMsg, myId: string | undefined, stamp: (at?: string) => string): ChatMsg {
  const created = m.createdAt || m.created_at;
  const own = isOwn(m, myId);
  return {
    id: String(m.id || m._id || m.msg_id),
    sender: own ? 'me' : 'doc',
    text: m.body || m.content || m.text || '',
    time: created ? stamp(created) : '',
    at: created ? new Date(created).getTime() : Date.now(),
    kind: kindOf(m.type),
    mediaId: m.media_ids?.[0],
    clientId: m.client_message_id,
    tick: own ? tickOf(m) : undefined,
  };
}

/** Adds a message from the socket unless the device already has it (by server id, or as the sender's own pending send). */
export function addIncoming(prev: ChatMsg[], incoming: ChatMsg): ChatMsg[] {
  if (prev.some((m) => m.id === incoming.id)) return prev;
  if (incoming.clientId && prev.some((m) => m.clientId === incoming.clientId && m.sender === 'me')) {
    return prev.map((m) => (m.clientId === incoming.clientId ? { ...m, id: incoming.id, pending: false, queued: false, failed: false } : m));
  }
  return [...prev, incoming];
}

/** The server accepted a send: the local message takes the server id (and drops out if the socket echo already added it). */
export function confirmSent(prev: ChatMsg[], clientId: string, serverId: string | undefined): ChatMsg[] {
  const local = prev.find((m) => m.clientId === clientId);
  if (!local) return prev;
  if (!serverId) return prev.map((m) => (m.clientId === clientId ? { ...m, pending: false, queued: false, failed: false, tick: 'sent' } : m));
  const echoed = prev.some((m) => m.id === serverId && m !== local);
  if (echoed) return prev.filter((m) => m !== local).map((m) => (m.id === serverId ? { ...m, tick: m.tick ?? 'sent', clientId } : m));
  return prev.map((m) => (m === local ? { ...m, id: serverId, pending: false, queued: false, failed: false, tick: 'sent' } : m));
}

const rank: Record<Tick, number> = { sent: 0, delivered: 1, read: 2 };

/**
 * A delivered / read event from the other person moves the ticks of the device user's messages up to that moment (a tick never goes
 * back); a deleted event removes the message.
 */
export function applyState(prev: ChatMsg[], ev: StateEvent, myId?: string): ChatMsg[] {
  if (ev.kind === 'deleted') return ev.msg_id ? prev.filter((m) => m.id !== ev.msg_id) : prev;
  if (ev.kind !== 'delivered' && ev.kind !== 'read') return prev;
  if (myId && ev.user_id === myId) return prev;
  const upTo = ev.at ? new Date(ev.at).getTime() : Date.now();
  return prev.map((m) => {
    if (m.sender !== 'me' || m.pending || m.failed || m.at > upTo + 1000) return m;
    const next: Tick = ev.kind as Tick;
    return rank[next] > rank[m.tick ?? 'sent'] ? { ...m, tick: next } : m;
  });
}

/** Oldest first. The server answers newest first (chat.service getMessages), the thread reads top to bottom. */
export function chronological(list: ChatMsg[]): ChatMsg[] {
  return [...list].sort((a, b) => a.at - b.at);
}
