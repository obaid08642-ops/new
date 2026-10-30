import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Messages written without a connection (or that failed to send) wait here, on the device, and go out when the connection returns.
 * Each carries the client message id the server stores, so a retry, an app restart or a double flush never produces a second message.
 * Attachments keep the local file uri and upload on flush; a text message keeps its body.
 */
export interface OutboxItem {
  clientId: string;
  threadId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  body: string;
  asset?: { uri: string; name: string; mime: string; size?: number };
  durationSeconds?: number;
  createdAt: number;
  attempts: number;
}

const KEY = 'chat.outbox.v1';

export async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function save(items: OutboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: the in-memory copy still sends this session */
  }
}

export async function enqueue(item: OutboxItem): Promise<void> {
  const items = await loadOutbox();
  if (items.some((i) => i.clientId === item.clientId)) return;
  await save([...items, item]);
}

export async function remove(clientId: string): Promise<void> {
  await save((await loadOutbox()).filter((i) => i.clientId !== clientId));
}

export async function forThread(threadId: string): Promise<OutboxItem[]> {
  return (await loadOutbox()).filter((i) => i.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt);
}

/** Sends the thread's queued items in the order written; stops at the first that fails so the order never swaps. */
export async function flush(
  threadId: string,
  send: (item: OutboxItem) => Promise<void>,
  onFail: (item: OutboxItem, error: unknown) => void,
): Promise<number> {
  let sent = 0;
  for (const item of await forThread(threadId)) {
    try {
      await send(item);
      await remove(item.clientId);
      sent++;
    } catch (e) {
      onFail(item, e);
      break;
    }
  }
  return sent;
}
