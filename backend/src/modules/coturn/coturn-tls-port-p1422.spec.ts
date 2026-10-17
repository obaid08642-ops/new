import { CoturnService } from './coturn.service';

// P14.22: TURN over TLS on 443 for strict networks is a setting (COTURN_TLS_PORT), 5349 when unset.
describe('CoturnService TURN over TLS port (P14.22)', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  const turns = () => new CoturnService().generateCredentials('user-1').urls.filter((u: string) => u.startsWith('turns:'));

  beforeEach(() => {
    process.env.COTURN_HOST = 'turn.nabd.test';
    process.env.COTURN_SECRET = 'configured-secret-for-test';
    delete process.env.TURN_URLS;
  });

  it('defaults to 5349', () => {
    delete process.env.COTURN_TLS_PORT;
    expect(turns()).toEqual(['turns:turn.nabd.test:5349?transport=tcp']);
  });

  it('uses COTURN_TLS_PORT (443 on the calls server)', () => {
    process.env.COTURN_TLS_PORT = '443';
    expect(turns()).toEqual(['turns:turn.nabd.test:443?transport=tcp']);
  });
});
