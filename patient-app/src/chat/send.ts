import { apiFetch } from '../utils/api';
import type { OutboxItem } from './outbox';

/**
 * One attempt to deliver a queued message: upload the file first if it has one, then post with the item's client id (the server keeps
 * one message per client id, so a repeated attempt never stores it twice). Throws what apiFetch throws.
 */
export async function sendOutboxItem(item: OutboxItem): Promise<{ id?: string }> {
  let payload: Record<string, unknown> = { body: item.body, type: item.type };
  if (item.asset) {
    const form = new FormData();
    form.append('file', { uri: item.asset.uri, name: item.asset.name, type: item.asset.mime } as unknown as Blob);
    form.append('purpose', 'chat');
    form.append('thread_id', item.threadId);
    const up = await apiFetch<{ id?: string }>('/media/upload', { method: 'POST', body: form });
    if (!up?.id) throw new Error('upload_failed');
    payload = {
      body: item.type === 'voice' ? '' : item.asset.name,
      type: item.type,
      media_ids: [up.id],
      attachment_mime: item.asset.mime,
      attachment_name: item.asset.name,
      ...(item.asset.size ? { attachment_size: item.asset.size } : {}),
      ...(item.durationSeconds ? { duration_seconds: item.durationSeconds } : {}),
    };
  }
  const res = await apiFetch<{ id?: string; data?: { id?: string } }>(`/chat/threads/${item.threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, client_message_id: item.clientId }),
  });
  return { id: (res?.data || res)?.id };
}
