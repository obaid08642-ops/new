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
    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 300, 'appointment', 'appt-1', { paymentMethod: undefined });
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

    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 240, 'appointment', 'appt-3', { paymentMethod: undefined });
  });

  it('credits the covered total, not only the copay transaction amount', async () => {
    const { service, credit } = setup({
      booking: { id: 'appt-4', doctor_user_id: 'doctor-user-1', payment_status: 'paid', total_price: 240 },
      transactions: [{ amount: 40 }],
    });

    await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-4' });

    expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 240, 'appointment', 'appt-4', { paymentMethod: undefined });
  });

  describe("the credit is on the provider's own price lines only (F.4)", () => {
    it('a consultation paid 115 for a 100 fee credits 100: the platform service fee is not the doctor\'s', async () => {
      const { service, credit } = setup({
        booking: { id: 'appt-f1', doctor_user_id: 'doctor-user-1', payment_status: 'paid', price: 100, service_fee: 15, total_price: 115 },
        transactions: [{ amount: 115 }],
      });
      await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-f1' });
      expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 100, 'appointment', 'appt-f1', { paymentMethod: undefined });
    });

    it('a home consultation: service, home-visit and transport fees stay out of the credit', async () => {
      const { service, credit } = setup({
        booking: { id: 'appt-f2', doctor_user_id: 'doctor-user-1', payment_status: 'paid', payment_method: 'card', price: 400, service_fee: 15, home_visit_fee: 100, transportation_fee: 20, total_price: 535 },
        transactions: [{ amount: 535 }],
      });
      await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-f2' });
      expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 400, 'appointment', 'appt-f2', { paymentMethod: 'card' });
    });

    it('an insured co-pay below the doctor\'s price is credited as paid, not raised to the price', async () => {
      const { service, credit } = setup({
        booking: { id: 'appt-f3', doctor_user_id: 'doctor-user-1', payment_status: 'pending', price: 200, total_price: 215 },
        transactions: [{ amount: 40 }],
      });
      await service.creditCompletedService({ entity_type: 'appointment', entity_id: 'appt-f3' });
      expect(credit).toHaveBeenCalledWith('doctor-account-1', 'doctor', 40, 'appointment', 'appt-f3', { paymentMethod: undefined });
    });
  });

  describe('the commission of an earning (F.4)', () => {
    const ledger = (rules: any[], profile: any, cfg: any = { service_types: { doctor: { percent: 15 } }, tax: { vat_percent: 15 } }) => {
      const inserted: any[] = [];
      const conn = {
        collection: (name: string) => ({
          platformledgerentries: { findOne: async () => null, insertOne: async (d: any) => { inserted.push(d); } },
          finance_config: { findOne: async () => cfg },
          commissionrules: { findOne: async (q: any) => rules.find((r) => r.scope === q.scope && (!q.scope_id || r.scope_id === q.scope_id)) ?? null },
          provider_profiles: { findOne: async () => profile },
          provider_commission_promos: { find: () => ({ sort: () => ({ toArray: async () => [] }) }) },
        } as any)[name],
      };
      return { service: new ProviderOpsService(conn as any), inserted };
    };

    it('a provider rule beats the profile rate and the service default', async () => {
      const { service, inserted } = ledger([{ scope: 'provider', scope_id: 'acc-1', percent: 5, id: 'r1' }], { commission_cash_pct: 8 });
      await service.creditEarning('acc-1', 'doctor', 100, 'appointment', 'b1', { paymentMethod: 'card' });
      expect(inserted[0]).toMatchObject({ commission_percent: 5, commission_source: 'provider_override', commission: 5 });
    });

    it('the rate the admin set on the provider beats the service default, by payment method', async () => {
      const profile = { commission_cash_pct: 8, commission_insurance_pct: 6 };
      const cash = ledger([], profile); await cash.service.creditEarning('acc-1', 'doctor', 100, 'appointment', 'b2', { paymentMethod: 'card' });
      const ins = ledger([], profile); await ins.service.creditEarning('acc-1', 'doctor', 100, 'appointment', 'b3', { paymentMethod: 'insurance' });
      expect(cash.inserted[0]).toMatchObject({ commission_percent: 8, commission_source: 'provider_profile' });
      expect(ins.inserted[0]).toMatchObject({ commission_percent: 6, commission_source: 'provider_profile' });
    });

    it('with no provider rate it uses the finance-config service default (15 for a doctor), not a flat 10', async () => {
      const { service, inserted } = ledger([], {});
      await service.creditEarning('acc-1', 'doctor', 100, 'appointment', 'b4');
      expect(inserted[0]).toMatchObject({ commission_percent: 15, commission: 15, vat: 2.25, amount: 82.75 });
    });
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
