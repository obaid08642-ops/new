/** Row 1 of the provider/admin merge map: the second reject / suspend path answers 410 and touches nothing; the admin path is the one that decides. */
import { GoneException } from '@nestjs/common';
import { ProvidersController } from './providers.controller';

describe('retired POST /providers/:id/reject and /suspend', () => {
  const svc: any = { reject: jest.fn(), suspend: jest.fn() };
  const ctrl = new ProvidersController(svc);

  it('reject answers 410 Gone, names the replacement and never reaches the service', () => {
    let err: any;
    try { (ctrl as any).reject('p1'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(GoneException);
    expect(err.getStatus()).toBe(410);
    expect(JSON.stringify(err.getResponse())).toContain('/admin/providers/:id/reject');
    expect(svc.reject).not.toHaveBeenCalled();
  });

  it('suspend answers 410 Gone, names the replacement and never reaches the service', () => {
    let err: any;
    try { (ctrl as any).suspend('p1'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(GoneException);
    expect(err.getStatus()).toBe(410);
    expect(JSON.stringify(err.getResponse())).toContain('/admin/providers/:id/suspend');
    expect(svc.suspend).not.toHaveBeenCalled();
  });
});
