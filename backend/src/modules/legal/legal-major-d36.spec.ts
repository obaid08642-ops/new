import { LegalService } from './legal.module';

// D-36: an accepted text stays accepted through minor edits; a new MAJOR version asks every user again.
function serviceFor(policies: any[], accepted: any[]) {
  const service: any = Object.create(LegalService.prototype);
  const updates: any[] = [];
  service.conn = {
    collection: jest.fn((name: string) => {
      if (name === 'legal_policies') {
        return {
          find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(policies) })),
          findOne: jest.fn(async () => policies[0]),
          updateOne: jest.fn(async (_q: any, u: any) => { updates.push(u); return {}; }),
        };
      }
      if (name === 'legal_acceptances') return { find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(accepted) })) };
      // legal_policy_snapshots and anything else: an empty collection that accepts writes
      return { find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })), updateOne: jest.fn(async () => ({})) };
    }),
  };
  service.enterprise = { recordAudit: jest.fn(async () => undefined) };
  return { service: service as LegalService, updates };
}

describe('D-36 legal versions', () => {
  const terms = (version: string) => ({ key: 'patient_terms', version, requires_acceptance: true, applies_to: ['patient'], content_ar: 'x' });

  it('a minor edit (1.0 -> 1.1) does not ask again; a major version (2.0) does', async () => {
    const accepted = [{ policy_key: 'patient_terms', version: '1.0' }];
    expect(await serviceFor([terms('1.1')], accepted).service.pendingAcceptances({ id: 'p', role: 'patient' })).toEqual([]);
    const again = await serviceFor([terms('2.0')], accepted).service.pendingAcceptances({ id: 'p', role: 'patient' });
    expect(again.map((p: any) => p.key)).toEqual(['patient_terms']);
  });

  it('an edit is a minor version unless the admin marks it major', async () => {
    const minor = serviceFor([terms('1.3')], []);
    expect(await minor.service.upsertPolicy('adm', 'patient_terms', { content_ar: 'y' })).toEqual({ updated: true, version: '1.4' });
    const major = serviceFor([terms('1.3')], []);
    expect(await major.service.upsertPolicy('adm', 'patient_terms', { content_ar: 'y', major: true })).toEqual({ updated: true, version: '2.0' });
    expect(major.updates[0].$set).not.toHaveProperty('major');
  });
});

describe('every published version keeps its exact text', () => {
  it('an edit writes the new version\'s snapshot (once per key and version, never overwritten)', async () => {
    const snapshots: any[] = [];
    const { service } = serviceFor([{ key: 'provider_agreement', version: '1.0', requires_acceptance: true, content_ar: 'قديم', content_en: 'old', title_ar: 'ت', title_en: 't' }], []);
    (service as any).conn.collection = jest.fn((name: string) => name === 'legal_policy_snapshots'
      ? { updateOne: jest.fn(async (q: any, u: any, o: any) => { snapshots.push({ q, u, o }); return {}; }) }
      : { findOne: jest.fn(async () => ({ key: 'provider_agreement', version: '1.1', content_ar: 'جديد', content_en: 'new', title_ar: 'ت', title_en: 't' })), updateOne: jest.fn(async () => ({})) });
    await service.upsertPolicy('admin-1', 'provider_agreement', { content_ar: 'جديد', content_en: 'new' });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].q).toEqual({ key: 'provider_agreement', version: '1.1' });
    expect(snapshots[0].o).toEqual({ upsert: true });
    expect(snapshots[0].u.$setOnInsert).toMatchObject({ key: 'provider_agreement', version: '1.1', content_ar: 'جديد' });
    expect(snapshots[0].u.$setOnInsert.content_sha256_ar).toHaveLength(64);
    expect(snapshots[0].u.$set).toBeUndefined(); // $setOnInsert only: a stored snapshot is never changed
  });
});
