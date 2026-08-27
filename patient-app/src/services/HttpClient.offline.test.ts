import { HttpClient, OfflineMutationPendingError } from './HttpClient';

describe('HttpClient offline mutation contract', () => {
  it('rejects a network-failed mutation without retry, queue, or synthetic success', async () => {
    const handler = (HttpClient.interceptors.response as any).handlers[0].rejected;
    const error = {
      config: { method: 'post', url: '/unified-bookings', headers: {} },
      request: {},
      response: undefined,
    };

    await expect(handler(error)).rejects.toBeInstanceOf(OfflineMutationPendingError);
  });
});
