// R11 §5 lead 9: GET /provider/jobs/queue?status=incoming (the nurse, lab and
// radiology apps' incoming list) returned the exact address, contact and phone
// of requests the provider had not accepted yet.
import { ProviderJobsService } from './provider-jobs.module';

const chain = (rows: unknown[]) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) });
const nursingRow = {
  id: 'hc-1', patient_id: 'pat-1', state: 'PROVIDER_ASSIGNED', provider_id: 'nurse-1', createdAt: new Date(),
  address: { address: '12 Exact Street', lat: 24.7, lng: 46.6, district: 'Al Olaya', city: 'Riyadh' }, contact: { phone: '+966500000001' },
};

function service() {
  const empty = { find: () => chain([]) };
  const home = { find: () => chain([nursingRow]) };
  const users = {
    find: () => ({ lean: async () => [{ id: 'pat-1', full_name: 'Patient', phone: '+966500000001' }] }),
    db: { collection: () => ({ find: () => ({ toArray: async () => [] }) }) },
  };
  const providers = { findOne: () => ({ lean: async () => null }) };
  const attachments = { aggregate: async () => [] };
  return new ProviderJobsService(empty as never, empty as never, empty as never, home as never, empty as never, providers as never, users as never, attachments as never, {} as never);
}

describe('provider job queue privacy (R11 §5 lead 9)', () => {
  it('incoming jobs carry only the area, no phone or exact address', async () => {
    const [job] = await service().queue({ id: 'nurse-1', role: 'home_care' }, 'incoming', 'nursing') as Record<string, any>[];
    expect(job.patient_phone).toBeUndefined();
    expect(job.contact).toBeUndefined();
    expect(job.address).toEqual({ district: 'Al Olaya', city: 'Riyadh' });
    expect(job.patient_name).toBe('Patient');
  });

  it('active jobs keep the address and phone', async () => {
    const [job] = await service().queue({ id: 'nurse-1', role: 'home_care' }, 'active', 'nursing') as Record<string, any>[];
    expect(job.patient_phone).toBe('+966500000001');
    expect(job.address.address).toBe('12 Exact Street');
  });
});
