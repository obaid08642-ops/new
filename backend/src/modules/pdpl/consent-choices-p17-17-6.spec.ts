import { PdplService } from '../users/pdpl.service';
import { MedicinesService } from '../medicines/medicines.service';

// P17-17.6: banner-grade consent — without consent, no analytics request is
// sent. Red on the base: consent records are policy-version only, and search
// ingestion is gated by the killswitch alone, never by the user's choice.
describe('P17-17.6 consent choices gate analytics', () => {
  function pdplWith(users: Record<string, any> = {}) {
    const keyOf = (q: any) => (q && typeof q.id === 'object' ? q.id.$eq : q?.id);
    const userModel: any = {
      // Mongoose-like: awaitable directly and via .lean().
      findOne: jest.fn((q: any) => {
        const d = users[keyOf(q)] || null;
        return Object.assign(Promise.resolve(d), { lean: async () => d });
      }),
      updateOne: jest.fn(async (f: any, u: any) => {
        const id = keyOf(f);
        users[id] = { ...(users[id] || {}), ...u?.$set };
        return { modifiedCount: 1 };
      }),
    };
    const conn: any = {};
    const svc = new PdplService(conn, userModel);
    return { svc, userModel, users };
  }

  it('stores and returns per-purpose choices', async () => {
    const { svc } = pdplWith({ u1: { id: 'u1' } });
    await svc.setConsentChoices('u1', { analytics: false, marketing: true });
    const out: any = await svc.getConsentChoices('u1');
    expect(out.choices).toMatchObject({ analytics: false, marketing: true });
  });

  it('rejects non-boolean choices', async () => {
    const { svc } = pdplWith({ u1: { id: 'u1' } });
    await expect(svc.setConsentChoices('u1', { analytics: 'yes', marketing: true } as any)).rejects.toThrow();
    await expect(svc.setConsentChoices('nope', { analytics: true, marketing: true } as any)).rejects.toThrow();
  });

  it('a user who refused analytics is not tracked', async () => {
    const written: any[] = [];
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return { findOne: jest.fn(async () => ({ id: 'u1', consent_choices: { analytics: false } })) };
        }
        if (name === 'search_queries') {
          return { insertOne: jest.fn(async (d: any) => { written.push(d); return {}; }) };
        }
        return { findOne: jest.fn(async () => null) };
      }),
    };
    const svc = new MedicinesService({} as any, {} as any, {} as any, conn, {} as any);
    await (svc as any).trackSearch('vitamin', 5, 'u1');
    await new Promise((r) => setTimeout(r, 50));
    expect(written).toHaveLength(0);
  });

  it('a user who allowed analytics is tracked; unknown users keep legacy behavior', async () => {
    const written: any[] = [];
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return {
            findOne: jest.fn(async (q: any) => (q?.id === 'u2' ? { id: 'u2', consent_choices: { analytics: true } } : null)),
          };
        }
        if (name === 'search_queries') {
          return { insertOne: jest.fn(async (d: any) => { written.push(d); return {}; }) };
        }
        return { findOne: jest.fn(async () => null) };
      }),
    };
    const svc = new MedicinesService({} as any, {} as any, {} as any, conn, {} as any);
    await (svc as any).trackSearch('vitamin', 5, 'u2');
    await (svc as any).trackSearch('vitamin', 5, 'ghost');
    await new Promise((r) => setTimeout(r, 50));
    expect(written).toHaveLength(2);
  });
});
