/** POST /radiology/bookings takes the provider as an ordering quote names it (profile id) and accepts a centre the quote offered. */
import { RadiologyOpsService } from './radiology.service';

jest.mock('../../common/service-offers', () => ({ ...jest.requireActual('../../common/service-offers'), ownPrices: jest.fn(async () => new Map()) }));

const PATIENT = { id: 'pat-1', role: 'patient', full_name: 'P', phone: '0' };
const when = () => new Date(Date.now() + 86_400_000).toISOString();
const build = (opts: { profile?: any; equipment?: boolean; orderingItem?: boolean }) => {
  const created: any[] = [];
  const svc: any = Object.create(RadiologyOpsService.prototype);
  svc.getById = jest.fn(async () => ({ id: 'scan-1', price: 300, name_ar: 'x', name_en: 'x', modality: 'xr', body_part: 'chest', short_code: 'XR', home_visit_supported: true }));
  svc.compatibleProviders = jest.fn(async () => (opts.equipment ? [{ id: 'acc-1' }] : []));
  svc.profileModel = { findOne: () => ({ lean: async () => opts.profile ?? null }) };
  svc.svcModel = { db: { collection: (name: string) => ({ findOne: async () => (name === 'provider_ordering_items' && opts.orderingItem ? { catalog_id: 'scan-1' } : null) }) } };
  svc.bkgModel = { findOne: () => ({ lean: async () => null }), create: jest.fn(async (doc: any) => { created.push(doc); return doc; }) };
  svc.events = { emit: jest.fn() };
  svc.engine = { announceCreated: jest.fn(async () => undefined) };
  return { svc, created };
};
const body = (over: any = {}) => ({ service_id: 'scan-1', scheduled_at: when(), location_type: 'facility', payment_method: 'card', ...over });

describe('radiology booking: the provider of a quote', () => {
  it('a profile id (as the quote names it) resolves to the centre\'s account, which the booking belongs to', async () => {
    const { svc, created } = build({ profile: { account_id: 'acc-1' }, orderingItem: true });
    await svc.book(PATIENT, body({ provider_id: 'profile-1' }));
    expect(created[0]).toMatchObject({ provider_account_id: 'acc-1', total: 300 });
  });

  it('the centre is told about the new booking (bell + push), not only the patient', async () => {
    const { svc, created } = build({ profile: { account_id: 'acc-1' }, orderingItem: true });
    await svc.book(PATIENT, body({ provider_id: 'profile-1' }));
    expect(svc.engine.announceCreated).toHaveBeenCalledWith(expect.objectContaining({ kind: 'radiology', entity_id: created[0].id, patient_account_id: 'pat-1' }));
  });

  it('a centre that declared the scan in its ordering catalogue may be booked even without the equipment list', async () => {
    const { svc } = build({ profile: { account_id: 'acc-1' }, orderingItem: true, equipment: false });
    await expect(svc.book(PATIENT, body({ provider_id: 'profile-1' }))).resolves.toBeDefined();
  });

  it('a centre that neither has the equipment nor offered the scan is refused', async () => {
    const { svc, created } = build({ profile: { account_id: 'acc-1' } });
    await expect(svc.book(PATIENT, body({ provider_id: 'profile-1' }))).rejects.toThrow('provider_cannot_perform_scan');
    expect(created).toHaveLength(0);
  });

  it('an unknown profile id is refused, and the account id still works as before', async () => {
    const unknown = build({ profile: null });
    await expect(unknown.svc.book(PATIENT, body({ provider_id: 'nope' }))).rejects.toThrow('provider_not_found');
    const byAccount = build({ equipment: true });
    await byAccount.svc.book(PATIENT, body({ provider_account_id: 'acc-1' }));
    expect(byAccount.created[0].provider_account_id).toBe('acc-1');
  });

  it('with no provider at all a patient is still refused', async () => {
    await expect(build({}).svc.book(PATIENT, body())).rejects.toThrow('provider_account_id_required');
  });
});
