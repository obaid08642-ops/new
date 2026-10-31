import { AuthController } from './auth.controller';

describe('POST /auth/session/exchange-native', () => {
  it('returns the token pair as JSON and merges the guest bearer', async () => {
    const exchangePatientSession = jest.fn(async () => ({ access_token: 'a', refresh_token: 'r' }));
    const ctrl = new AuthController({ exchangePatientSession } as never);
    const req = { headers: {} } as never;
    const out = await ctrl.patientSessionExchangeNative({ exchange_token: 'x' }, req);
    expect(out).toEqual({ access_token: 'a', refresh_token: 'r' });
    expect(exchangePatientSession).toHaveBeenCalledWith('x', undefined);
  });
});
