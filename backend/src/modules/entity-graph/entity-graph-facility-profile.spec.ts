import { NotFoundException } from '@nestjs/common';
import { EntityGraphService } from './entity-graph.service';

// 12-web#12: the map links a hospital by its provider-profile id; the facility page answers from the public profile
// when there is no seeded facility with that id.
function serviceWith(facility: any, profile: any) {
  const service: any = Object.create(EntityGraphService.prototype);
  const findOne = jest.fn();
  service.connection = {
    collection: (name: string) => ({
      findOne: async (q: any) => { findOne(name, q); return name === 'facilities' ? facility : profile; },
      find: () => ({ project: () => ({ limit: () => ({ toArray: async () => [] }) }) }),
    }),
  };
  return { service: service as EntityGraphService, findOne };
}

describe('facility page for a registered hospital', () => {
  it('answers from the public hospital profile when no facility has that id', async () => {
    const { service, findOne } = serviceWith(null, { id: 'p1', type: 'hospital', display_name_ar: 'مستشفى الاختبار', city: 'الرياض' });
    const out: any = await service.getRelated('facility', 'p1');
    expect(out.entity).toMatchObject({ id: 'p1', name_ar: 'مستشفى الاختبار', type: 'hospital', city: 'الرياض' });
    const profileQuery = findOne.mock.calls.find(([name]) => name === 'provider_profiles')[1];
    expect(profileQuery).toMatchObject({ status: 'active', public_eligibility: true, medical_review_status: 'approved', type: { $in: ['hospital', 'clinic'] } });
  });

  it('is still not found when neither exists', async () => {
    const { service } = serviceWith(null, null);
    await expect(service.getRelated('facility', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('facility page: address, logo, pin and hours (issue 767)', () => {
  it('carries them from a registered hospital profile, and nothing it does not have', async () => {
    const { service } = serviceWith(null, {
      id: 'p1', type: 'hospital', name_ar: 'مستشفى', address: ' شارع الملك ', logo: 'https://cdn.test/logo.png', location: { lat: 24.7, lng: 46.6 },
      working_hours: [{ day: 'sat', open: '08:00', close: '22:00' }, { day: 'fri', closed: true }, { nonsense: true }],
    });
    const out: any = await service.getRelated('facility', 'p1');
    expect(out.entity).toMatchObject({ address: 'شارع الملك', logo: 'https://cdn.test/logo.png', lat: 24.7, lng: 46.6 });
    expect(out.entity.working_hours).toEqual([
      { day: 'sat', open: '08:00', close: '22:00', open_evening: null, close_evening: null, closed: false },
      { day: 'fri', open: null, close: null, open_evening: null, close_evening: null, closed: true },
    ]);
  });

  it('has no pin, address, logo or hours when the record has none (never a placeholder)', async () => {
    const { service } = serviceWith(null, { id: 'p2', type: 'clinic', name_ar: 'عيادة' });
    const out: any = await service.getRelated('facility', 'p2');
    expect(out.entity).toMatchObject({ address: null, logo: null, lat: null, lng: null, working_hours: [] });
  });

  it('reads the seeded facility the same way (logo_url, location)', async () => {
    const { service } = serviceWith({ id: 'f1', slug: 'f', name_ar: 'م', type: 'hospital', logo_url: 'https://cdn.test/f.png', location: { lat: 24.71, lng: 46.68 }, address: 'العليا', phone: '+966', working_hours: [{ day: 'sun', open: '00:00', close: '23:59' }] }, null);
    const out: any = await service.getRelated('facility', 'f');
    expect(out.entity).toMatchObject({ logo: 'https://cdn.test/f.png', lat: 24.71, lng: 46.68, address: 'العليا', phone: '+966' });
  });
});
