import { ReconciliationService } from './reconciliation.service';

// P13-R13: failed propagations are visible in admin and a reconciliation job
// compares the discovery projections with the source collections and repairs
// drift. Red on the base: no failed-list endpoint beyond the 20-row embed in
// status(), and no reconciliation job at all.
describe('P13-R13 failed propagation list and reconciliation', () => {
  function setup() {
    const projections = [
      { entity_type: 'provider', entity_id: 'p-drift', published: true, indexable: true },
      { entity_type: 'provider', entity_id: 'p-clean', published: false, indexable: false },
      { entity_type: 'provider', entity_id: 'p-gone', published: true, indexable: true },
    ];
    const sources: any = {
      // suspended after the projection was published -> drift
      'p-drift': { id: 'p-drift', status: 'suspended', public_eligibility: false, medical_review_status: 'pending' },
      // stays unpublished -> clean
      'p-clean': { id: 'p-clean', status: 'suspended', public_eligibility: false, medical_review_status: 'pending' },
      // p-gone has no source row -> orphan
    };
    const stored: any[] = [];
    const updated: any[] = [];
    const col = (name: string) => {
      if (name === 'public_catalog_projections') {
        return {
          find: jest.fn((q: any = {}) => ({
            sort: () => ({
              limit: () => ({
                toArray: async () => projections.filter((p: any) => !q?.entity_id || p.entity_id === q.entity_id),
              }),
            }),
          })),
          updateOne: jest.fn(async (f: any, u: any) => { updated.push({ f, u }); return { modifiedCount: 1 }; }),
        };
      }
      if (name === 'provider_profiles') {
        return { findOne: jest.fn(async (q: any) => sources[q?.id] || null) };
      }
      if (name === 'reconciliation_reports') {
        return { insertOne: jest.fn(async (d: any) => { stored.push(d); return { insertedId: 'r1' }; }), find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => stored }) }) })) };
      }
      if (name === 'event_dlq') {
        return {
          find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [{ original_event_id: 'e1', type: 'catalog.publication.projected', status: 'pending' }] }) }) })),
          countDocuments: jest.fn(async () => 1),
        };
      }
      if (name === 'domain_outbox') {
        return { find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [{ aggregate_id: 'o1', state: 'pending' }] }) }) })) };
      }
      return { findOne: jest.fn(async () => null), find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) })), countDocuments: jest.fn(async () => 0) };
    };
    const conn: any = { collection: jest.fn((n: string) => col(n)) };
    const publication = { refresh: jest.fn(async () => ({ published: false })) };
    const svc = new ReconciliationService(conn, publication as any);
    return { svc, conn, stored, updated, publication };
  }

  it('repairs a drifted projection and stores a report', async () => {
    const { svc, stored, updated, publication } = setup();
    const out: any = await svc.reconcile({ limit: 100 });
    expect(out.scanned).toBe(3);
    expect(out.drifted).toBe(2);
    expect(out.repaired).toBe(2);
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'provider', entityId: 'p-drift' }));
    expect(updated.some((u: any) => u.f.entity_id === 'p-gone' && u.u.$set.published === false)).toBe(true);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ scanned: 3, drifted: 2, repaired: 2 });
  });

  it('reports zero drift on a clean projection set', async () => {
    const { svc, publication } = setup();
    // Narrow the double to the clean row only by reconciling with a filter
    const out: any = await svc.reconcile({ limit: 100, entityId: 'p-clean' });
    expect(out).toMatchObject({ scanned: 1, drifted: 0, repaired: 0 });
    expect(publication.refresh).not.toHaveBeenCalled();
  });

  it('lists failed propagations: DLQ rows plus stuck outbox events', async () => {
    const { svc } = setup();
    const out: any = await svc.failedList({ limit: 50 });
    expect(out.dlq.map((d: any) => d.original_event_id)).toEqual(['e1']);
    expect(out.stuck_outbox.map((d: any) => d.aggregate_id)).toEqual(['o1']);
  });

  it('latest() returns the most recent reconciliation report', async () => {
    const { svc } = setup();
    await svc.reconcile({ limit: 100 });
    const out: any = await svc.latest();
    expect(out).toMatchObject({ scanned: 3, drifted: 2, repaired: 2 });
  });
});
