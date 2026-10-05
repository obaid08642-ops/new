// R11 §5: LabsEngineController (labs/bookings/queue, :id/respond,
// collect-sample/:id, finalize-test/:id, catalog, wallet) took lab_id from the
// query or body, and collect-sample / finalize-test checked no owner at all,
// so any lab account could write results into any booking. No client calls
// these routes and they work on their own empty collections (labcenterbookings,
// labcatalogs); the lab app uses LabsController. The routes are removed.
import 'reflect-metadata';
import { LabsModule } from './labs.module';

const ENGINE_PATHS = ['queue', ':id/respond', 'collect-sample/:id', 'finalize-test/:id', 'catalog', 'wallet'];

describe('the unguarded lab engine routes are gone (R11 §5)', () => {
  it('no labs controller maps them', () => {
    const controllers: Function[] = Reflect.getMetadata('controllers', LabsModule) || [];
    const routes: string[] = [];
    for (const c of controllers) {
      const base = String(Reflect.getMetadata('path', c) || '');
      for (const name of Object.getOwnPropertyNames(c.prototype)) {
        const handler = (c.prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function' || name === 'constructor') continue;
        const path = Reflect.getMetadata('path', handler);
        if (path !== undefined) routes.push(`${base}/${path}`.replace(/\/+/g, '/'));
      }
    }
    expect(routes.length).toBeGreaterThan(0);
    for (const p of ENGINE_PATHS) expect(routes).not.toContain(`labs/bookings/${p}`);
  });
});
