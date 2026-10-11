import { AppointmentsService } from './appointments.service';

// OC-C C-16 (660/661/683): summary lines carry medicine_id; outcome carries referrals.
function serviceFor(opts: { summary?: any; referral?: any | null; medicines?: any[] }) {
  const service: any = Object.create(AppointmentsService.prototype);
  const appt = { id: 'appt-1', _id: '507f1f77bcf86cd799439011', patient_id: 'pat-1', doctor_id: 'doc-1', doctor_user_id: 'du-1', summary: opts.summary ?? null, save: jest.fn() };
  service.apptModel = { findOne: jest.fn().mockResolvedValue(appt), create: jest.fn() };
  service.providerModel = {};
  const meds = opts.medicines ?? [{ id: 'med-panadol', name_ar: 'بنادول', name_en: 'Panadol', translations: {} }];
  service.connection = {
    collection: jest.fn((name: string) => {
      if (name === 'medicines') return {
        // Evaluates the $or of anchored name regexes like Mongo would, over the seeded rows.
        findOne: jest.fn(async (q: any) => meds.find((m: any) => (q.$or || []).some((c: any) => {
          const [field, re] = Object.entries(c)[0] as [string, RegExp];
          const v = field.split('.').reduce((o: any, k) => (o == null ? o : o[k]), m);
          return typeof v === 'string' && re.test(v);
        })) ?? null),
      };
      if (name === 'encounterreferrals') return { findOne: jest.fn().mockResolvedValue(opts.referral ?? null) };
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };
  return { service: service as AppointmentsService, appt };
}

describe('OC C-16 summary catalogue links and referrals', () => {
  it('finish persists medicine_id per line (sent or resolved by name)', async () => {
    const { service, appt } = serviceFor({});
    (service as any).transition = jest.fn().mockResolvedValue({ id: 'appt-1', status: 'COMPLETED' });
    (service as any).assertAppointmentAccess = jest.fn().mockResolvedValue(null);
    await service.finish('appt-1', { diagnosis: 'flu', prescription: [{ name: 'بنادول', dose: '500mg' }] }, { id: 'du-1', role: 'doctor' });
    const lines = appt.summary.prescription;
    expect(lines[0].medicine_id).toBe('med-panadol');
  });

  it('getSummary returns medicine_id and outcome referrals', async () => {
    const { service } = serviceFor({
      summary: { diagnosis: 'flu', prescription: [{ name: 'بنادول', medicine_id: 'med-panadol' }] },
      referral: { requested_lab_tests: ['cbc'], requested_radiology_scans: ['chest-xray'] },
    });
    const out: any = await service.getSummary('appt-1', { id: 'pat-1', role: 'patient' });
    expect(out.prescription[0].medicine_id).toBe('med-panadol');
    expect(out.referrals).toMatchObject({ lab_tests: ['cbc'], radiology_scans: ['chest-xray'] });
  });

  it('getSummary backfills medicine_id for legacy lines by catalogue name', async () => {
    const { service } = serviceFor({ summary: { diagnosis: 'flu', prescription: [{ name: 'Panadol' }] }, referral: null });
    const out: any = await service.getSummary('appt-1', { id: 'pat-1', role: 'patient' });
    expect(out.prescription[0].medicine_id).toBe('med-panadol');
  });
});
