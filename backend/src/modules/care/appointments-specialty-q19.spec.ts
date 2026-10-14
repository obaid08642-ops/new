/** Q-19: specialty id + every catalog locale from SPECIALTY_MASTER. */
import { AppointmentsService } from './appointments.service';

describe('Q-19 specialty catalog fields', () => {
  it('attaches specialty_id + ar/en names from the catalog', async () => {
    const appt: any = {
      id: 'a1', patient_id: 'pat-1', doctor_id: 'd1', service_type: 'clinic',
      status: 'CONFIRMED', duration_minutes: 30, state_history: [],
      toObject: function (this: any) { const { toObject: _t, ...rest } = this; return { ...rest }; },
    };
    const apptModel: any = { findOne: async () => appt };
    const providerModel: any = { findOne: async () => ({ name_ar: 'د', specialty: 'cardiology' }) };
    const engine: any = { apply: async (op: any) => op.mutate() };
    const svc = new (AppointmentsService as any)(apptModel, providerModel, {}, { emit: () => undefined }, engine, {}, undefined);
    const out: any = await svc.one({ id: 'pat-1', role: 'patient' }, 'a1');
    expect(out.specialty_id).toBe('cardiology');
    expect(out.specialty_name_en).toBe('Cardiology');
    expect(out.specialty_ar).toBeTruthy();
  });
});
