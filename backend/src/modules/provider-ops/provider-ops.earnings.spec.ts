import { registerAuditSink } from '../../common/audit-record';
import { ProviderOpsService } from './provider-ops.module';

describe('ProviderOpsService completion earnings (LJ-09)', () => {
  function setup({ booking, transactions = [] }: { booking: any; transactions?: any[] }) {
    const appointments = { findOne: jest.fn().mockResolvedValue(booking) };
    const txns = { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(transactions) }) };
    const accounts = { findOne: jest.fn().mockResolvedValue({ id: 'doctor-account-1', user_id: 'doctor-user-1' }) };
    const conn = {
      collection: jest.fn((name: string) => ({
        appointments,
        transactions: txns,
        provider_accounts: accounts,
      }[name] || {})),
    };
    const service = new ProviderOpsService(conn as any);
    const credit = jest.spyOn(service, 'creditEarning').mockResolvedValue({});
    return { service, appointments, txns, accounts, credit };
  }

  it('credits only successfully paid consultation transactions to the linked provider account', async () => {
    const { service, appointments, txns, accounts, credit } = setup({
      booking: { id: 'appt-1', doctor_user_id: 'doctor-user-1', payment_status: 'pending', total_price: 300 },
      transactions: [{ amount: 300 }],
    });

    await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-1' });

    expect(appointments.findOne).toHaveBeenCalledWith({ id: 'appt-1' });
    expect(txns.find).toHaveBeenCalledWith(
      { booking_kind: 'consultation', booking_id: 'appt-1', status: 'paid' },
      { projection: { amount: 1, _id: 0 } },
    );
    expect(accounts.findOne).toHaveBeenCalledWith({ $or: [{ id: 'doctor-user-1' }, { user_id: 'doctor-user-1' }] });
    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 300, 'appointment', 'appt-1');
  });

  it('does not credit an unpaid booking or a non-provider domain', async () => {
    const { service, credit } = setup({
      booking: { id: 'appt-2', doctor_user_id: 'doctor-user-1', payment_status: 'pending', total_price: 300 },
    });

    await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-2' });
    await service.creditCompletedService({ entity_type: 'chat', entity_id: 'thread-1' });

    expect(credit).not.toHaveBeenCalled();
  });

  it('uses the verified amount collected for paid cash or insurance bookings when there is no gateway transaction', async () => {
    const { service, credit } = setup({
      booking: { id: 'appt-3', doctor_user_id: 'doctor-user-1', payment_status: 'covered_by_insurance', total_price: 240 },
    });

    await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-3' });

    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 240, 'appointment', 'appt-3');
  });

  it('credits the covered total, not only the copay transaction amount', async () => {
    const { service, credit } = setup({
      booking: { id: 'appt-4', doctor_user_id: 'doctor-user-1', payment_status: 'paid', total_price: 240 },
      transactions: [{ amount: 40 }],
    });

    await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-4' });

    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 240, 'appointment', 'appt-4');
  });

  describe('a completed service that credits nothing says so (gap 9)', () => {
    const skips = (events: any[]) => events.filter((e) => e.action === 'provider_earning.skipped').map((e) => e.details.reason);
    let events: any[];
    beforeEach(() => { events = []; registerAuditSink(async (e) => { events.push(e); }); });
    afterAll(() => registerAuditSink(null));

    it('names nothing_collected for a booking with no collected amount', async () => {
      const { service, credit } = setup({ booking: { id: 'appt-3', doctor_user_id: 'doctor-user-1', payment_status: 'pending', total_price: 300 } });
      await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-3' });
      expect(credit).not.toHaveBeenCalled();
      expect(skips(events)).toEqual(['nothing_collected']);
      expect(events[0]).toEqual(expect.objectContaining({ resource_kind: 'consultation_booking', resource_id: 'appt-3' }));
    });

    it('names no_provider_on_booking, booking_not_found and no_provider_account', async () => {
      const a = setup({ booking: { id: 'appt-4', payment_status: 'paid', total_price: 300 } });
      await a.service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-4' });
      const b = setup({ booking: null });
      await b.service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-5' });
      const c = setup({ booking: { id: 'appt-6', doctor_user_id: 'doctor-user-9', payment_status: 'paid', total_price: 300 } });
      c.accounts.findOne.mockResolvedValue(null);
      await c.service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-6' });
      expect(skips(events)).toEqual(['no_provider_on_booking', 'booking_not_found', 'no_provider_account']);
      expect(a.credit).not.toHaveBeenCalled(); expect(b.credit).not.toHaveBeenCalled(); expect(c.credit).not.toHaveBeenCalled();
    });

    it('a normal credit records no skip', async () => {
      const { service, credit } = setup({ booking: { id: 'appt-7', doctor_user_id: 'doctor-user-1', payment_status: 'paid', total_price: 300 } });
      await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-7' });
      expect(credit).toHaveBeenCalled();
      expect(skips(events)).toEqual([]);
    });
  });
});
