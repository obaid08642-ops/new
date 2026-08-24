import { OfflineMutationQueueDisabledError, SyncManager } from './SyncManager';

describe('SyncManager offline mutation safety', () => {
  it('refuses to persist or replay a mutation until the live idempotency contract exists', async () => {
    await expect(SyncManager.enqueueRequest({
      method: 'post', url: '/orders', data: { sensitive: 'value' }, headers: { Authorization: 'Bearer token' },
    })).rejects.toBeInstanceOf(OfflineMutationQueueDisabledError);
    await expect(SyncManager.getQueue()).resolves.toEqual([]);
  });
});
