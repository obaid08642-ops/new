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

export async function getOfflineMessages(): Promise<OfflineMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue', err);
    return [];
  }
}

export async function addOfflineMessage(msg: OfflineMessage): Promise<void> {
  try {
    const messages = await getOfflineMessages();
    messages.push(msg);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(messages));
  } catch (err) {
    console.error('Error adding to offline queue', err);
  }
}

export async function removeOfflineMessage(id: string): Promise<void> {
  try {
    const messages = await getOfflineMessages();
    const filtered = messages.filter(m => m.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error removing from offline queue', err);
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error('Error clearing offline queue', err);
  }
}
