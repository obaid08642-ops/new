// R11 independent check (on 963eb888 / 23d1f360): the radiology twin of the
// removed lab engine, RadiologyProviderController, was still live. GET
// /radiology/provider/queue returned every center's PENDING_ACCEPTANCE
// bookings, and POST /radiology/provider/:id/respond let any center cancel a
// pending booking for everyone, or claim it without an atomic check. No client
// calls these routes and nothing in production writes their collection; the
// radiology app uses RadiologyController (/radiology/provider/inbox).
import 'reflect-metadata';
import { RadiologyModule } from './radiology.module';

describe('the radiology provider engine routes are gone', () => {
  it('no radiology controller maps them', () => {
    const controllers: Function[] = Reflect.getMetadata('controllers', RadiologyModule) || [];
    const routes: string[] = [];
    for (const c of controllers) {
      const base = String(Reflect.getMetadata('path', c) || '');
      for (const name of Object.getOwnPropertyNames(c.prototype)) {
        const h = Object.getOwnPropertyDescriptor(c.prototype, name)?.value;
        const path = typeof h === 'function' ? Reflect.getMetadata('path', h) : undefined;
        if (path !== undefined) routes.push(`${base}/${path}`.replace(/\/+/g, '/'));
      }
    }
    expect(routes).toContain('radiology/provider/inbox');
    for (const p of ['queue', ':id/respond', 'allocate-machine/:id', 'finalize-scan/:id', 'wallet', 'inventory']) {
      expect(routes).not.toContain(`radiology/provider/${p}`);
    }
  });
});
