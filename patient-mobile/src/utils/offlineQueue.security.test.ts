jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addOfflineMessage,
  OfflineMessageQueueDisabledError,
} from './offlineQueue';

describe('offline message queue safety', () => {
  beforeEach(() => jest.clearAllMocks());

  it('purges legacy data and rejects a message instead of persisting its content', async () => {
    await expect(addOfflineMessage({
      id: 'm1', threadId: 't1', content: 'sensitive message', receiverId: 'patient-2',
      messageType: 'text', createdAt: Date.now(),
    })).rejects.toBeInstanceOf(OfflineMessageQueueDisabledError);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@nabdah_offline_messages');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
