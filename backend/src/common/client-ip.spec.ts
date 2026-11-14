import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('ignores a client-supplied X-Forwarded-For: the address is the one Express resolved from the trusted proxy hops', () => {
    const req: any = { ip: '203.0.113.7', headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }, socket: { remoteAddress: '10.0.0.2' } };
    expect(clientIp(req)).toBe('203.0.113.7');
  });
  it('a rotating fake first entry does not change the address', () => {
    const real = '198.51.100.9';
    const seen = new Set(['1.1.1.1', '2.2.2.2', '3.3.3.3'].map((fake) => clientIp({ ip: real, headers: { 'x-forwarded-for': `${fake}, ${real}` } } as any)));
    expect([...seen]).toEqual([real]);
  });
  it('falls back to the socket address, and to undefined when there is neither', () => {
    expect(clientIp({ socket: { remoteAddress: '10.0.0.2' } } as any)).toBe('10.0.0.2');
    expect(clientIp({} as any)).toBeUndefined();
    expect(clientIp({ ip: '  ' } as any)).toBeUndefined();
  });
});
