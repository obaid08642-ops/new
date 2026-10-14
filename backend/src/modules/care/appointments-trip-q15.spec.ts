/** Q-15: provider start-trip / arrived for home visits; 400 otherwise. */
import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

const apptDoc = (over: any = {}) => ({
  id: 'a1', patient_id: 'pat-1', doctor_id: 'd1', doctor_user_id: 'doc-1', service_type: 'home',
  status: 'CONFIRMED', duration_minutes: 30, state_history: [],
  markModified: () => undefined, save: async () => undefined,
  toObject: function (this: any) { const { markModified: _m, save: _s, toObject: _t, ...rest } = this; return { ...rest }; },
  ...over,
});

const svcWith = (appt: any) => {
  const apptModel: any = { findOne: async () => appt };
  const providerModel: any = { findOne: async () => ({ id: 'd1', user_id: 'doc-1' }) };
  const engine: any = { apply: async (op: any) => op.mutate() };
  return new (AppointmentsService as any)(apptModel, providerModel, {}, { emit: () => undefined }, engine, {}, undefined);
};
const DOC = { id: 'doc-1', role: 'doctor' };

describe('Q-15 home-visit trip states', () => {
  it('CONFIRMED -> EN_ROUTE -> ARRIVED for home visits', async () => {
    const svc = svcWith(apptDoc());
    expect((await svc.enRoute('a1', DOC)).status).toBe('EN_ROUTE');
    expect((await svc.arrive('a1', DOC)).status).toBe('ARRIVED');
  });

  it('refuses trip states for non-home appointments', async () => {
    const svc = svcWith(apptDoc({ service_type: 'clinic' }));
    await expect(svc.enRoute('a1', DOC)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.arrive('a1', DOC)).rejects.toBeInstanceOf(BadRequestException);
  });
});
