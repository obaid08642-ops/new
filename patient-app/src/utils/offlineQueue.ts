import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineMessage {
  id: string;
  threadId: string;
  content: string;
  receiverId: string;
  messageType: 'text' | 'image' | 'voice' | 'file';
  createdAt: number;
}

const OFFLINE_QUEUE_KEY = '@nabdah_offline_messages';

/** A message must be retried only after a published, owner-bound chat contract exists. */
export class OfflineMessageQueueDisabledError extends Error {
  constructor() { super('offline_message_queue_disabled_pending_contract'); }
}

async function purgeLegacyQueue(): Promise<void> {
  try { await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY); } catch { /* cleanup only */ }
}

export async function getOfflineMessages(): Promise<OfflineMessage[]> {
  await purgeLegacyQueue();
  return [];
}

export async function addOfflineMessage(_msg: OfflineMessage): Promise<never> {
  await purgeLegacyQueue();
  throw new OfflineMessageQueueDisabledError();
}

export async function removeOfflineMessage(_id: string): Promise<void> {
  await purgeLegacyQueue();
}

export async function clearOfflineQueue(): Promise<void> {
  await purgeLegacyQueue();
}
