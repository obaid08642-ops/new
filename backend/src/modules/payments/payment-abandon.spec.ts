import { PaymentAbandonService, paymentWindowMinutes } from './payments.module';
import { AppointmentsService } from '../care/appointments.service';

const lean = <T>(v: T) => ({ limit: () => ({ lean: async () => v }), lean: async () => v });

function build(opts: { stale: any[]; open?: any[]; after: any }) {
  const emitted: Array<[string, any]> = [];
  const txns = { find: jest.fn(() => lean(opts.open || [])), updateMany: jest.fn(async () => ({})) };
  const appts = {
    find: jest.fn(() => lean(opts.stale)),
    findOne: jest.fn(() => lean(opts.after)),
  };
  const payments = { verifyPayment: jest.fn(async () => ({})) };
  const events = { emit: jest.fn((n: string, p: any) => { emitted.push([n, p]); }) };
  const svc = new PaymentAbandonService(txns as any, appts as any, payments as any, events as any);
  return { svc, txns, appts, payments, emitted };
}

describe('abandoned card payments release the slot', () => {
  it('asks only for card consultations still PENDING and unpaid past the window', async () => {
    const { svc, appts } = build({ stale: [], after: null });
    await svc.sweep(new Date('2026-10-31T12:00:00Z'));
    const q = (appts.find.mock.calls[0] as any[])[0];
    expect(q).toMatchObject({ status: 'PENDING', payment_method: 'card', payment_status: { $ne: 'paid' } });
    expect(q.createdAt.$lt.toISOString()).toBe('2026-10-31T11:30:00.000Z');
  });

  it('cancels the open payment attempts and announces payment.abandoned when the gateway has no payment', async () => {
    const { svc, txns, payments, emitted } = build({ stale: [{ id: 'a1', patient_id: 'p1' }], open: [{ id: 't1', patient_id: 'p1' }], after: { status: 'PENDING', payment_status: 'pending' } });
    const out = await svc.sweep();
    expect(payments.verifyPayment).toHaveBeenCalledWith({ id: 'p1', role: 'system' }, 't1');
    expect((txns.updateMany.mock.calls[0] as any[])[1]).toEqual({ $set: { status: 'cancelled', failure_reason: 'payment_abandoned' } });
    expect(emitted).toEqual([['payment.abandoned', { booking_kind: 'consultation', booking_id: 'a1', patient_id: 'p1' }]]);
    expect(out.released).toEqual(['a1']);
  });

  it('leaves a booking alone when the last gateway check shows it was paid', async () => {
    const { svc, txns, emitted } = build({ stale: [{ id: 'a2', patient_id: 'p1' }], open: [{ id: 't2', patient_id: 'p1' }], after: { status: 'CONFIRMED', payment_status: 'paid' } });
    const out = await svc.sweep();
    expect(txns.updateMany).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
    expect(out.settled).toEqual(['a2']);
  });

  it('the window is 30 minutes unless PAYMENT_WINDOW_MINUTES is a sane number', () => {
    expect(paymentWindowMinutes({} as any)).toBe(30);
    expect(paymentWindowMinutes({ PAYMENT_WINDOW_MINUTES: '45' } as any)).toBe(45);
    expect(paymentWindowMinutes({ PAYMENT_WINDOW_MINUTES: '1' } as any)).toBe(30);
  });
});

describe('AppointmentsService reacts to an abandoned or late payment', () => {
  function appt(over: any) {
    return { id: 'a1', patient_id: 'p1', doctor_id: 'd1', total_price: 230, status: 'PENDING', payment_status: 'pending', state_history: [], save: jest.fn(), ...over };
  }
  function svcWith(a: any) {
    const svc = Object.create(AppointmentsService.prototype) as any;
    svc.apptModel = { findOne: jest.fn(async () => a), updateOne: jest.fn(async () => ({})) };
    svc.events = { emit: jest.fn() };
    svc.logger = { log: jest.fn(), warn: jest.fn() };
    svc.transition = jest.fn(async () => ({}));
    return svc as unknown as { onPaymentAbandoned: (p: any) => Promise<void>; onPaymentCompleted: (p: any) => Promise<void>; events: { emit: jest.Mock }; transition: jest.Mock };
  }

  it('payment.abandoned cancels a PENDING unpaid booking with the system actor', async () => {
    const s = svcWith(appt({}));
    await s.onPaymentAbandoned({ booking_kind: 'consultation', booking_id: 'a1' });
    expect(s.transition).toHaveBeenCalledWith('a1', 'CANCELLED', { id: 'system', role: 'system' }, 'payment_abandoned');
  });

  it('payment.abandoned never touches a booking that is already confirmed', async () => {
    const s = svcWith(appt({ status: 'CONFIRMED', payment_status: 'paid' }));
    await s.onPaymentAbandoned({ booking_kind: 'consultation', booking_id: 'a1' });
    expect(s.transition).not.toHaveBeenCalled();
  });

  it('money arriving after the release is refunded in full and the booking stays cancelled', async () => {
    const s = svcWith(appt({ status: 'CANCELLED', state_history: [{ state: 'CANCELLED', note: 'payment_abandoned' }] }));
    await s.onPaymentCompleted({ booking_kind: 'consultation', booking_id: 'a1', amount: 230, transaction_id: 't9' });
    expect(s.events.emit).toHaveBeenCalledWith('appointment.refund.calculated', expect.objectContaining({ appointment_id: 'a1', patient_id: 'p1', refund_percentage: 100, total_price: 230 }));
    expect(s.transition).not.toHaveBeenCalled();
  });
});
