import { ForbiddenException } from '@nestjs/common';
import { BansMiddleware } from './bans.middleware';
import { BansService } from './bans.service';

// An IP ban must hold when the banned caller adds an X-Forwarded-For header of their own: nginx appends the real address to it,
// so the raw header is "<anything the client wrote>, <real address>" and never equals the banned address.
describe('BansMiddleware', () => {
  const service = (banned: string[]) => ({ isBanned: (type: string, v: string) => type === 'ip' && banned.includes(v) }) as unknown as BansService;
  const run = (mw: BansMiddleware, req: any) => { const next = jest.fn(); mw.use(req, {} as any, next); return next; };

  it('refuses a banned address even when the caller sends a forged X-Forwarded-For first entry', () => {
    const mw = new BansMiddleware(service(['203.0.113.7']));
    const req: any = { ip: '203.0.113.7', headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }, socket: { remoteAddress: '10.0.0.2' } };
    expect(() => run(mw, req)).toThrow(ForbiddenException);
  });

  it('lets a different address through, and a forged header cannot make it look banned', () => {
    const mw = new BansMiddleware(service(['203.0.113.7']));
    const req: any = { ip: '198.51.100.9', headers: { 'x-forwarded-for': '203.0.113.7' }, socket: { remoteAddress: '10.0.0.2' } };
    expect(run(mw, req)).toHaveBeenCalled();
  });

  it('a banned device is still refused', () => {
    const mw = new BansMiddleware({ isBanned: (type: string, v: string) => type === 'device' && v === 'dev-1' } as unknown as BansService);
    const req: any = { ip: '198.51.100.9', headers: { 'x-device-id': 'dev-1' }, socket: {} };
    expect(() => run(mw, req)).toThrow(ForbiddenException);
  });
});
