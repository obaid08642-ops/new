import { ProviderAuthController } from './provider.controllers';

// R39: the provider session must be bound to the device that signs in, or the app's first refresh is a
// "device mismatch" (session revoked, provider signed out) and every session shares the device id 'unknown'.
describe('provider login keeps the client device id (R39)', () => {
  const svc = { login: jest.fn(async (x: any) => x) };
  const ctrl = new ProviderAuthController(svc as any);
  const req = { ip: '10.0.0.1', headers: { 'user-agent': 'ua', 'x-device-id': 'hdr-device' } };

  beforeEach(() => svc.login.mockClear());

  it('passes meta.device_identifier from the body', async () => {
    await ctrl.login({ email: 'a@b.c', password: 'x', meta: { device_identifier: 'body-device' } } as any, req);
    expect(svc.login.mock.calls[0][0].meta).toEqual({ ip: '10.0.0.1', ua: 'ua', device_identifier: 'body-device' });
  });

  it('falls back to the X-Device-ID header', async () => {
    await ctrl.login({ email: 'a@b.c', password: 'x' } as any, req);
    expect(svc.login.mock.calls[0][0].meta.device_identifier).toBe('hdr-device');
  });

  it('never lets the client override ip/ua through meta', async () => {
    await ctrl.login({ email: 'a@b.c', password: 'x', meta: { ip: '1.2.3.4', ua: 'spoof', device_identifier: 7 } } as any, { ip: '10.0.0.1', headers: {} });
    expect(svc.login.mock.calls[0][0].meta).toEqual({ ip: '10.0.0.1', ua: undefined, device_identifier: undefined });
  });
});
