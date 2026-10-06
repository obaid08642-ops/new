// Independent check: three public reads returned providers that are not
// public (pending, suspended, or awaiting medical review): the facility page's
// doctor list and the explore page (entity-graph), the public nurse profile,
// and the provider badge. Each now requires an active, public, approved provider.
import { EntityGraphService } from '../entity-graph/entity-graph.service';
import { ProviderBadgeController } from './provider-badge.controller';
import { HomeCareCompatController } from '../home-care/home-care-compat.module';

const PUBLIC = { status: 'active', public_eligibility: true, medical_review_status: 'approved' };
const PUBLIC_FACILITY = { is_active: true, public_eligibility: true, medical_review_status: 'approved' };

describe('public provider reads only show public, approved providers', () => {
  it('entity-graph doctor lists filter on the public conditions', async () => {
    const filters: any[] = [];
    const cursor = { project: () => cursor, limit: () => cursor, sort: () => cursor, skip: () => cursor, toArray: async () => [] };
    const conn: any = { collection: (name: string) => ({
      findOne: async () => (name === 'facilities' ? { id: 'f1' } : null),
      find: (q: any) => { filters.push([name, q]); return cursor; },
      countDocuments: async () => 0,
    }) };
    const svc = Object.create(EntityGraphService.prototype);
    svc.connection = conn;
    await svc.explore({ specialty: 'cardiology' }).catch(() => null);
    expect(filters.length).toBeGreaterThan(0);
    for (const [name, q] of filters) expect(q).toMatchObject(name === 'facilities' ? PUBLIC_FACILITY : PUBLIC);
  });

  it('entity-graph doctor and facility pages resolve only public, approved entities', async () => {
    const seen: Array<[string, any]> = [];
    const conn: any = { collection: (name: string) => ({ findOne: async (q: any) => { seen.push([name, q]); return null; } }) };
    const svc = Object.create(EntityGraphService.prototype);
    svc.connection = conn;
    await svc.getRelatedDoctor('d1').catch(() => null);
    await svc.getRelatedFacility('f1').catch(() => null);
    expect(seen.find(([n]) => n === 'provider_profiles')?.[1]).toMatchObject(PUBLIC);
    expect(seen.find(([n]) => n === 'facilities')?.[1]).toMatchObject(PUBLIC_FACILITY);
  });

  it('the badge needs an active, public, approved provider', async () => {
    const seen: any[] = [];
    const ctrl = new ProviderBadgeController({ collection: () => ({ findOne: async (q: any) => { seen.push(q); return null; } }) } as never);
    await expect(ctrl.badge('p1')).rejects.toThrow('badge_not_available');
    expect(seen[0]).toMatchObject(PUBLIC);
  });

  it('the public nurse profile needs medical approval', async () => {
    const seen: any[] = [];
    const profiles = { findOne: (q: any) => { seen.push(q); return { lean: async () => null }; } };
    const ctrl = Object.create(HomeCareCompatController.prototype);
    ctrl.profiles = profiles;
    await expect(ctrl.provider('n1')).rejects.toThrow('provider not found');
    expect(seen[0]).toMatchObject(PUBLIC);
  });
});
