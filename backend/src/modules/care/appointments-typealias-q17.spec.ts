/** Q-17: detail aliases service_type as consultation_type (clients read it). */
import { AppointmentsService } from './appointments.service';

describe('Q-17 consultation_type alias', () => {
  it('video appointment detail carries consultation_type=video', async () => {
    const appt: any = {
      id: 'a1', patient_id: 'pat-1', doctor_id: 'd1', service_type: 'video',
      status: 'CONFIRMED', duration_minutes: 30, state_history: [],
      toObject: function (this: any) { const { toObject: _t, ...rest } = this; return { ...rest }; },
    };
    const apptModel: any = { findOne: async () => appt };
    const providerModel: any = { findOne: async () => ({ name_ar: 'د', specialty: 'general_practice' }) };
    const engine: any = { apply: async (op: any) => op.mutate() };
    const svc = new (AppointmentsService as any)(apptModel, providerModel, {}, { emit: () => undefined }, engine, {}, undefined);
    const out: any = await svc.one({ id: 'pat-1', role: 'patient' }, 'a1');
    expect(out.consultation_type).toBe('video');
  });
});
