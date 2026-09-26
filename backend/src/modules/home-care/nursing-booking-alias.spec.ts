import { NursingController } from './home-care.controller';
import { PatientHomeCareController } from './patient-home-care.controller';

/** P5.3d: single booking implementation — both URL shapes delegate to HomeCareSvc.book. */
describe('nursing single booking API', () => {
  it('canonical POST /nursing/bookings delegates to HomeCareSvc.book', async () => {
    const homeSvc: any = { book: jest.fn().mockResolvedValue({ id: 'b1' }) };
    const c = new NursingController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, homeSvc);
    const u = { id: 'p1' };
    const body: any = { service_id: 's1', scheduled_at: new Date().toISOString() };
    await c.createBooking(u, body);
    expect(homeSvc.book).toHaveBeenCalledWith(u, body);
  });

  it('alias POST /home-care/bookings maps onto the same HomeCareSvc.book call', async () => {
    const homeSvc: any = { book: jest.fn().mockResolvedValue({ id: 'b1' }), mineFor: jest.fn() };
    const c = new PatientHomeCareController({} as any, homeSvc);
    const u = { id: 'p1' };
    await c.book(u, { service_id: 's1', scheduled_at: '2026-10-01T10:00:00Z', notes: 'n', payment_method: 'cash' } as any);
    expect(homeSvc.book).toHaveBeenCalledWith(u, expect.objectContaining({ service_id: 's1', payment_method: 'cash' }));
  });
});
