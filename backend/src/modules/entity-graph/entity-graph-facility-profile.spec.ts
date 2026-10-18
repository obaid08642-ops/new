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
