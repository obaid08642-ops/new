/**
 * 14.17 — the guard sheds ONLY marked routes, ONLY under overload, and always
 * with Retry-After. Critical routes are never marked, so they can never shed.
 *
 * Pinned with an injectable load signal (no real saturated loop needed):
 *  1. unmarked route under overload → serves (true).
 *  2. marked route under normal load → serves (true).
 *  3. marked route with loop delay past threshold → 503 + Retry-After header.
 *  4. marked route with heap past threshold → 503 + Retry-After header.
 *  5. the 503 body is the `server_shedding_load` code clients key Retry-After on.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoadSheddingGuard, ShedOnOverload, SHED_ON_OVERLOAD_KEY } from './load-shedding.guard';

const calm = { eventLoopDelayMs: () => 10, heapUsedRatio: () => 0.4 };
const hotLoop = { eventLoopDelayMs: () => 500, heapUsedRatio: () => 0.4 };
const hotHeap = { eventLoopDelayMs: () => 10, heapUsedRatio: () => 0.95 };

function ctxFor(handler: any) {
  const setHeader = jest.fn();
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/x', headers: {} }),
      getResponse: () => ({ setHeader }),
    }),
    getHandler: () => handler,
    getClass: () => ({}),
    setHeader,
  } as any;
}

class Probe {
  plain() { return 1; }
  @ShedOnOverload()
  sheddable() { return 1; }
}

describe('14.17 LoadSheddingGuard (mocked load signal)', () => {
  it('serves an unmarked route even under overload (critical paths never shed)', async () => {
    const g = new LoadSheddingGuard(new Reflector(), hotLoop);
    const ctx: any = ctxFor(Probe.prototype.plain);
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.setHeader).not.toHaveBeenCalled();
  });

  it('serves a marked route under normal load', async () => {
    const g = new LoadSheddingGuard(new Reflector(), calm);
    const ctx: any = ctxFor(Probe.prototype.sheddable);
    await expect(g.canActivate(ctx)).resolves.toBe(true);
  });

  it('sheds a marked route on loop saturation with Retry-After', async () => {
    const g = new LoadSheddingGuard(new Reflector(), hotLoop);
    const ctx: any = ctxFor(Probe.prototype.sheddable);
    await expect(g.canActivate(ctx)).rejects.toThrow(ServiceUnavailableException);
    expect(ctx.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('sheds a marked route on heap exhaustion with Retry-After', async () => {
    const g = new LoadSheddingGuard(new Reflector(), hotHeap);
    const ctx: any = ctxFor(Probe.prototype.sheddable);
    await expect(g.canActivate(ctx)).rejects.toThrow(/server_shedding_load/);
    expect(ctx.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('instantiates with Reflector alone (what Nest DI provides) and runs', async () => {
    // Regression: the guard must be constructible by Nest with only its
    // declared providers. Unprovided params arrive as undefined and the
    // defaults apply — otherwise the whole backend fails to boot with
    // UnknownDependenciesException and the live gate runs zero journeys.
    // Load-agnostic: on a calm machine it serves, on a saturated one it sheds
    // with a proper 503 + Retry-After. Both prove DI works and logic runs.
    const g = new LoadSheddingGuard(new Reflector(), undefined as any, undefined as any);
    const ctx: any = ctxFor(Probe.prototype.sheddable);
    const settled = await g.canActivate(ctx).then(
      (v) => ({ served: v }),
      (e) => ({ shed: e }),
    );
    if ('served' in settled) {
      expect(settled.served).toBe(true);
    } else {
      expect(settled.shed).toBeInstanceOf(ServiceUnavailableException);
      expect(ctx.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    }
  });

  it('exposes the marker key for route auditing', () => {
    expect(SHED_ON_OVERLOAD_KEY).toBe('nabd_shed_on_overload');
    expect(Reflect.getMetadata(SHED_ON_OVERLOAD_KEY, Probe.prototype.sheddable)).toBe(true);
    expect(Reflect.getMetadata(SHED_ON_OVERLOAD_KEY, Probe.prototype.plain)).toBeUndefined();
  });
});
