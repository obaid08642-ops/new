import { HomeController } from './home.controller';
import { providerDisplayName } from './home.service';

describe('home: upcoming appointment and provider names (Batch 0 review B4)', () => {
  const res = () => ({ status: jest.fn() });

  it('answers 204 with no body when there is no upcoming appointment', async () => {
    const r = res();
    const c = new HomeController({ getUpcomingAppointment: async () => null } as never);
    await expect(c.getUpcomingAppointment(r as never)).resolves.toBeUndefined();
    expect(r.status).toHaveBeenCalledWith(204);
  });

  it('answers 200 with the appointment when there is one', async () => {
    const r = res();
    const appt = { id: 'a1', date: '2026-10-06', doctorName: 'د. سارة', type: 'استشارة فيديو', time: '10:00 ص' };
    const c = new HomeController({ getUpcomingAppointment: async () => appt } as never);
    await expect(c.getUpcomingAppointment(r as never)).resolves.toEqual(appt);
    expect(r.status).not.toHaveBeenCalled();
  });

  it('reads the declared name fields (display_name_ar, name_ar, name_en), never a missing `name`', () => {
    expect(providerDisplayName({ display_name_ar: 'د. سارة', name_ar: 'سارة أحمد' })).toBe('د. سارة');
    expect(providerDisplayName({ name_ar: 'سارة أحمد', name_en: 'Sara' })).toBe('سارة أحمد');
    expect(providerDisplayName({ name_en: 'Sara' })).toBe('Sara');
    expect(providerDisplayName({ facility_name: 'مستشفى' })).toBe('مستشفى');
    expect(providerDisplayName({ name: 'legacy' } as never)).toBeNull();
    expect(providerDisplayName(null)).toBeNull();
  });
});
