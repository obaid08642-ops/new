import 'reflect-metadata';
import { MODULE_METADATA, PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from '../app.module';

// Two controllers that serve the same METHOD + path: the one registered first answers, the other is never reached and drifts
// (gap 9: /hospital/staff GET/POST/DELETE were declared in HospitalController and in HospitalStaffController). One handler per route.
type Ctor = { name: string; prototype: object };

function controllersInOrder(): Ctor[] {
  const seen = new Set<unknown>();
  const out: Ctor[] = [];
  const visit = (mod: unknown): void => {
    if (!mod || seen.has(mod)) return;
    seen.add(mod);
    const record = mod as { module?: unknown; imports?: unknown[]; controllers?: Ctor[] };
    const target = typeof mod === 'function' ? mod : record.module;
    for (const c of record.controllers || []) out.push(c);
    if (typeof target !== 'function') { for (const i of record.imports || []) visit(i); return; }
    for (const c of (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, target) as Ctor[] | undefined) || []) out.push(c);
    for (const i of (Reflect.getMetadata(MODULE_METADATA.IMPORTS, target) as unknown[] | undefined) || []) {
      visit(i && typeof i === 'object' && 'forwardRef' in (i as object) ? (i as { forwardRef: () => unknown }).forwardRef() : i);
    }
  };
  visit(AppModule);
  return out;
}

const join = (...parts: Array<string | string[] | undefined>): string =>
  '/' + parts.flatMap((p) => (Array.isArray(p) ? p : [p])).filter((p): p is string => typeof p === 'string').join('/').split('/').filter(Boolean).join('/');

// Routes declared twice when this spec was written (not part of gap 9, reported to the lead: each needs a decision which handler stays). A NEW duplicate fails the spec; resolving one means deleting its line here.
const KNOWN: Record<string, string> = {
  'GET /seo/resolve/:p/:p': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /provider/pharmacy/orders/:p/accept': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /provider/pharmacy/orders/:p/submit-basket': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /provider/pharmacy/orders/:p/insurance': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /provider/pharmacy/orders/:p/dispatch': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /notifications/unread-count': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /insurance/coverage-check': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /home-care/services': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /home-care/packages': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /home-care/bookings': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /home-care/bookings/my': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'PATCH /notifications/:p/read': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /medical/programs/active': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'POST /medical/programs/complete-session': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'GET /commissions': 'found by this spec on 2026-10-30; owner to decide which handler stays',
  'PUT /commissions/:p': 'found by this spec on 2026-10-30; owner to decide which handler stays',
};

describe('every METHOD + path is served by one handler', () => {
  it('has no route declared in two controllers (or twice in one)', () => {
    const owners = new Map<string, string[]>();
    for (const ctrl of new Set(controllersInOrder())) {
      const base = Reflect.getMetadata(PATH_METADATA, ctrl) as string | string[] | undefined;
      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        const fn = Object.getOwnPropertyDescriptor(ctrl.prototype, name)?.value as unknown;   // a getter must not run here
        if (typeof fn !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, fn as object) as number | undefined;
        if (method === undefined) continue;
        const sub = Reflect.getMetadata(PATH_METADATA, fn as object) as string | string[] | undefined;
        for (const b of Array.isArray(base) ? base : [base]) for (const s of Array.isArray(sub) ? sub : [sub]) {
          const key = `${RequestMethod[method]} ${join(b, s).replace(/:[A-Za-z_]+/g, ':p')}`;
          owners.set(key, [...(owners.get(key) || []), `${ctrl.name}.${name}`]);
        }
      }
    }
    const dups = [...owners].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}  <-  ${v.join(' , ')}`);
    const fresh = dups.filter((d) => !KNOWN[d.split('  <-  ')[0]]);
    expect(fresh).toEqual([]);
  });
});
