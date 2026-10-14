import { HomeService, providerDisplayName } from './home.service';

// Needs-review #419: Home's upcoming appointment names the doctor from the provider profile's real fields.
describe('HomeService upcoming appointment doctor name', () => {
  it('reads the display name of the doctor profile', async () => {
    const slot = new Date(Date.now() + 86_400_000);
    const appt = { id: 'ap-1', doctor_id: 'doc-1', doctor_user_id: 'u-doc', slot_start: slot, service_type: 'clinic' };
    const apptModel: any = {
      findOne: () => ({ sort: () => ({ exec: async () => appt }) }),
      db: { collection: () => ({ findOne: async () => ({ id: 'doc-1', display_name_ar: 'د. سارة' }) }) },
    };
    const service = new HomeService({} as any, apptModel, { user: { id: 'p-1' } });
    await expect(service.getUpcomingAppointment()).resolves.toMatchObject({ id: 'ap-1', doctorName: 'د. سارة' });
  });

  it('falls back through the profile name fields', () => {
    expect(providerDisplayName({ name_en: 'Dr Sara' })).toBe('Dr Sara');
    expect(providerDisplayName({ business_name: 'Al Shifa' })).toBe('Al Shifa');
    expect(providerDisplayName(null)).toBeNull();
  });
});
