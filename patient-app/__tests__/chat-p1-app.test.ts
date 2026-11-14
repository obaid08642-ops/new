const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));
const mockSend = jest.fn(async (_i: unknown): Promise<{ id?: string }> => ({ id: 'srv' }));
jest.mock('../src/chat/send', () => ({ sendOutboxItem: (i: unknown) => mockSend(i) }));
let mockNetCb: (s: { isConnected: boolean; isInternetReachable: boolean | null }) => void = () => undefined;
const mockNetOff = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: (cb: typeof mockNetCb) => { mockNetCb = cb; return mockNetOff; } },
}));
let mockAppCb: (s: string) => void = () => undefined;
const mockAppRemove = jest.fn();
jest.mock('react-native', () => ({ AppState: { addEventListener: (_e: string, cb: typeof mockAppCb) => { mockAppCb = cb; return { remove: mockAppRemove }; } } }));
jest.mock('../src/components/ScanStatusBadge', () => ({ ScanStatusBadge: () => null }));
const mockApi = jest.fn();
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a) }));

import { enqueue, loadOutbox, type OutboxItem } from '../src/chat/outbox';
import { flushOutbox, onOutboxEvent, startOutboxRunner, type OutboxEvent } from '../src/chat/outboxRunner';
import { probeMedia } from '../src/chat/MediaScanWatch';

const item = (id: string, at: number, thread = 't1'): OutboxItem => ({ clientId: id, threadId: thread, type: 'text', body: id, createdAt: at, attempts: 0 });
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('the outbox runner sends queued messages with no chat screen open', () => {
  beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); mockSend.mockClear(); mockSend.mockImplementation(async () => ({ id: 'srv' })); });

  it('sends every thread in order and tells listeners (a screen would confirm the message with the server id)', async () => {
    await enqueue(item('a', 1));
    await enqueue(item('b', 2, 't2'));
    const events: OutboxEvent[] = [];
    const off = onOutboxEvent((e) => events.push(e));
    await flushOutbox();
    off();
    expect(events.map((e) => `${e.type}:${e.item.clientId}`)).toEqual(['sent:a', 'sent:b']);
    expect(events[0]).toMatchObject({ serverId: 'srv' });
    expect(await loadOutbox()).toEqual([]);
  });

  it('starts at once, again when the connection returns and when the app comes back to the foreground, and stops cleanly', async () => {
    await enqueue(item('a', 1));
    const stop = startOutboxRunner();
    await tick(); await tick();
    expect(mockSend).toHaveBeenCalledTimes(1);
    await enqueue(item('b', 2));
    mockNetCb({ isConnected: false, isInternetReachable: false });
    await tick();
    expect(mockSend).toHaveBeenCalledTimes(1); // still offline: nothing sent
    mockNetCb({ isConnected: true, isInternetReachable: true });
    await tick(); await tick();
    expect(mockSend).toHaveBeenCalledTimes(2);
    await enqueue(item('c', 3));
    mockAppCb('background');
    await tick();
    expect(mockSend).toHaveBeenCalledTimes(2);
    mockAppCb('active');
    await tick(); await tick();
    expect(mockSend).toHaveBeenCalledTimes(3);
    stop();
    expect(mockNetOff).toHaveBeenCalled();
    expect(mockAppRemove).toHaveBeenCalled();
  });

  it('without a connection the message stays queued and the listener hears a transient failure', async () => {
    await enqueue(item('a', 1));
    mockSend.mockImplementation(async () => { throw new Error('OFFLINE_ERROR'); });
    const events: OutboxEvent[] = [];
    const off = onOutboxEvent((e) => events.push(e));
    await flushOutbox();
    off();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'failed', kind: 'transient', dead: false });
    expect((await loadOutbox()).map((i) => i.clientId)).toEqual(['a']);
  });
});

describe('an attachment that is still being scanned is a state, not an error', () => {
  it('maps the scan answers: 423 file_pending_scan waits, file_infected is refused, a link is ready, anything else is not a verdict', async () => {
    mockApi.mockResolvedValueOnce({ url: 'https://x' });
    expect(await probeMedia('m1')).toEqual({ status: 200 });
    mockApi.mockRejectedValueOnce(new Error('file_pending_scan'));
    expect(await probeMedia('m1')).toMatchObject({ status: 423 });
    mockApi.mockRejectedValueOnce(new Error('file_infected'));
    expect(await probeMedia('m1')).toMatchObject({ status: 400 });
    mockApi.mockRejectedValueOnce(new Error('boom'));
    expect(await probeMedia('m1')).toEqual({ status: 503 });
    expect(mockApi).toHaveBeenLastCalledWith('/media/m1/url');
  });
});

describe('screens', () => {
  const read = (p: string) => (require('fs') as typeof import('fs')).readFileSync((require('path') as typeof import('path')).join(__dirname, '..', p), 'utf8');

  it('the chat screen no longer sends directly: it queues, asks the runner, and listens for what happened', () => {
    const src = read('app/consultations/chat-with-doctor.tsx');
    expect(src).toContain('await enqueue(item);\n    void flushOutbox();');
    expect(src).toContain('onOutboxEvent(');
    expect(src).not.toContain('await deliver(');
    expect(src).not.toContain('const deliver');
  });

  it('opening a file that is being scanned shows "being checked" with the scan gate instead of the generic error', () => {
    const src = read('app/consultations/chat-with-doctor.tsx');
    expect(src).toContain("message === 'file_pending_scan'");
    expect(src).toContain('<MediaScanWatch');
    expect(src).toContain('ScanStatusBadge state="rejected"');
  });

  it('the runner starts with the signed-in session, independent of any chat screen', () => {
    const src = read('src/components/NotificationHandler.tsx');
    expect(src).toContain('const stopOutbox = startOutboxRunner();');
    expect(src).toContain('stopOutbox();');
  });
});
