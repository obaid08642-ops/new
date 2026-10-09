import { HomeService } from './home.service';

// Needs-review issue 442: the upcoming appointment carries its exact start and its state.
describe('HomeService upcoming appointment fields', () => {
  it('returns scheduled_at (ISO) and status', async () => {
    const slot = new Date('2030-03-04T09:30:00.000Z');
    const appt = { id: 'ap-1', status: 'CONFIRMED', slot_start: slot, service_type: 'video' };
    const apptModel: any = { findOne: () => ({ sort: () => ({ exec: async () => appt }) }), db: { collection: () => ({ findOne: async () => null }) } };
    const service = new HomeService({} as any, apptModel, { user: { id: 'p-1' } });
    await expect(service.getUpcomingAppointment()).resolves.toMatchObject({ id: 'ap-1', date: '2030-03-04', scheduled_at: '2030-03-04T09:30:00.000Z', status: 'CONFIRMED' });
  });
});
