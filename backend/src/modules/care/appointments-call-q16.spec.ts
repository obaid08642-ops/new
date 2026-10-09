/** Q-16: video appointments carry call info; owner-checked call records. */
import { AppointmentsService } from './appointments.service';

const apptDoc = (over: any = {}) => ({
  id: 'a1', patient_id: 'pat-1', doctor_id: 'd1', doctor_user_id: 'doc-1', service_type: 'video',
  status: 'CONFIRMED', duration_minutes: 30, state_history: [],
  markModified: () => undefined, save: async () => undefined,
  toObject: function (this: any) { const { markModified: _m, save: _s, toObject: _t, ...rest } = this; return { ...rest }; },
  ...over,
});

const svcWith = (appt: any) => {
  const apptModel: any = {
    findOne: async () => appt,
    find: () => ({ sort: () => ({ limit: async () => [appt] }) }),
  };
  const providerModel: any = { findOne: async () => ({ id: 'd1', user_id: 'doc-1', name_ar: 'د', specialty: 'general_practice' }) };
  const engine: any = { apply: async (op: any) => op.mutate() };
  return new (AppointmentsService as any)(apptModel, providerModel, {}, { emit: () => undefined }, engine, {}, undefined);
};

describe('Q-16 video call info', () => {
  it('detail carries room + join path + joinable for video', async () => {
    const out: any = await svcWith(apptDoc()).one({ id: 'pat-1', role: 'patient' }, 'a1');
    expect(out.call).toMatchObject({ room: 'appt_a1', join_path: '/care/appointments/a1/call', joinable: true });
  });

  it('callsFor lists only the video calls', async () => {
    const out: any = await svcWith(apptDoc()).callsFor({ id: 'pat-1', role: 'patient' });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ appointment_id: 'a1', room: 'appt_a1' });
  });
});
