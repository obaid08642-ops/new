import { PushService } from './push.module';

/** Calls ring from a data-only push on devices that ring themselves; other devices keep the visible alert. */
function serviceWith(tokens: any[]) {
  const service: any = Object.create(PushService.prototype);
  service.logger = { debug: jest.fn(), error: jest.fn() };
  service.EXPO_URL = 'https://exp.host/--/api/v2/push/send';
  service.tokens = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tokens) }),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  service.logs = { create: jest.fn().mockResolvedValue({}) };
  service.deliverWebPush = jest.fn().mockResolvedValue(undefined);
  service.sendApnsVoip = jest.fn().mockResolvedValue({ ok: true });
  return service;
}

const call = { type: 'call', session_id: 's1', call_type: 'video', caller_id: 'u9' };

describe('PushService call ring', () => {
  afterEach(() => jest.restoreAllMocks());

  it('FCM: a ringing device gets a data-only high-priority 30 s message, others a visible alert', () => {
    const service: any = Object.create(PushService.prototype);
    const ring = service.fcmMessage('t1', 'Dr A', 'Incoming call', call, true).message;
    expect(ring.notification).toBeUndefined();
    expect(ring.android).toEqual({ priority: 'HIGH', ttl: '30s' });
    expect(ring.data).toMatchObject({ type: 'call', session_id: 's1', title: 'Dr A', body: 'Incoming call' });
    const plain = service.fcmMessage('t2', 'Dr A', 'Incoming call', call, false).message;
    expect(plain.notification).toEqual({ title: 'Dr A', body: 'Incoming call' });
    expect(plain.android.notification.channel_id).toBe('calls');
  });

  it('Expo: call_ring tokens get data-only content-available, others keep title/body/sound', async () => {
    const service = serviceWith([
      { token: 'ExpoA', provider: 'expo', call_ring: true },
      { token: 'ExpoB', provider: 'expo' },
    ]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    } as Response);
    await service.deliverPush({ userId: 'u1', title: 'Dr A', body: 'Incoming call', data: call });
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent[0]).toMatchObject({ to: 'ExpoA', priority: 'high', ttl: 30, _contentAvailable: true, data: { session_id: 's1', title: 'Dr A' } });
    expect(sent[0].title).toBeUndefined();
    expect(sent[0].sound).toBeUndefined();
    expect(sent[1]).toMatchObject({ to: 'ExpoB', title: 'Dr A', sound: 'default' });
  });

  it('a chat push never takes the data-only path, even for a call_ring token', async () => {
    const service = serviceWith([{ token: 'ExpoA', provider: 'expo', call_ring: true }]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ status: 'ok' }] }) } as Response);
    await service.deliverPush({ userId: 'u1', title: 'Hi', body: 'msg', data: { type: 'chat' } });
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent[0].title).toBe('Hi');
  });

  it('PushKit: only call pushes go to apns_voip tokens', async () => {
    const service = serviceWith([{ token: 'voip1', provider: 'apns_voip', call_ring: true }]);
    await service.deliverPush({ userId: 'u1', title: 'Dr A', body: 'Incoming call', data: call });
    expect(service.sendApnsVoip).toHaveBeenCalledWith('voip1', 'Dr A', 'Incoming call', call);
    service.sendApnsVoip.mockClear();
    await service.deliverPush({ userId: 'u1', title: 'Hi', body: 'msg', data: { type: 'chat' } });
    expect(service.sendApnsVoip).not.toHaveBeenCalled();
  });

  it('PushKit: a dead VoIP token is deactivated', async () => {
    const service = serviceWith([{ token: 'voip1', provider: 'apns_voip' }]);
    service.sendApnsVoip.mockResolvedValue({ ok: false, reason: 'BadDeviceToken' });
    await service.deliverPush({ userId: 'u1', title: 'a', body: 'b', data: call });
    expect(service.tokens.updateOne).toHaveBeenCalledWith({ token: 'voip1' }, { $set: { active: false } });
  });

  it('a cancel stops the ringing: data-only to ring tokens, and never a PushKit push', async () => {
    const service = serviceWith([
      { token: 'ExpoA', provider: 'expo', call_ring: true },
      { token: 'voip1', provider: 'apns_voip', call_ring: true },
    ]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ status: 'ok' }] }) } as Response);
    await service.deliverPush({ userId: 'u1', title: 'x', body: 'y', data: { type: 'call_cancelled', session_id: 's1' } });
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent[0]).toMatchObject({ to: 'ExpoA', priority: 'high', _contentAvailable: true, data: { type: 'call_cancelled', session_id: 's1' } });
    expect(sent[0].title).toBeUndefined();
    expect(service.sendApnsVoip).not.toHaveBeenCalled();
  });
});
