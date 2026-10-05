import * as crypto from 'crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { CoturnService } from './coturn.service';

/**
 * Q94: with COTURN_HOST set and COTURN_SECRET missing, credentials were signed
 * with the literal 'change_this_secret' from the repo, so anyone could mint
 * TURN credentials offline. A missing secret must mean "not configured".
 */
describe('CoturnService never signs with a default secret (Q94)', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('refuses to issue credentials when COTURN_SECRET is missing', () => {
    process.env.COTURN_HOST = 'turn.nabd.test';
    delete process.env.TURN_URLS;
    delete process.env.COTURN_SECRET;
    const svc = new CoturnService();
    expect(svc.isConfigured()).toBe(false);
    expect(() => svc.generateCredentials('user-1')).toThrow(ServiceUnavailableException);
  });

  it('signs with the configured secret', () => {
    process.env.COTURN_HOST = 'turn.nabd.test';
    process.env.COTURN_SECRET = 'configured-secret-for-test';
    const creds = new CoturnService().generateCredentials('user-1');
    const expected = crypto.createHmac('sha1', 'configured-secret-for-test').update(creds.username).digest('base64');
    expect(creds.credential).toBe(expected);
  });
});
