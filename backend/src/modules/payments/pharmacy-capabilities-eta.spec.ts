import { PaymentsService } from './payments.module';

/** Design parity (#1819, pay-screen): the capabilities answer carries the selected offer's own delivery estimate. */
describe('pharmacy payment capabilities: eta_minutes', () => {
  const OLD = process.env.MOYASAR_API_KEY;
  beforeEach(() => { process.env.MOYASAR_API_KEY = 'sk_test_FIXTURE_NOT_A_REAL_KEY'; });
  afterEach(() => { if (OLD === undefined) delete process.env.MOYASAR_API_KEY; else process.env.MOYASAR_API_KEY = OLD; });

  const make = (offer: any) => {
    const order = { id: 'po-1', patient_account_id: 'pat-1', selected_offer_id: 'of-1', pricing_snapshot: { hash: 'h', totals: { total: 115 } }, quote_accepted_at: new Date() };
    const findOne = jest.fn(async (q: any) => (q.id === 'po-1' ? order : q.id === 'of-1' ? offer : null));
    const svc: any = Object.create(PaymentsService.prototype);
    svc.txns = { db: { collection: () => ({ findOne }) } };
    return { svc, findOne };
  };

  it("returns the pharmacy's estimate and reads nothing else from the offer", async () => {
    const { svc, findOne } = make({ fulfillment: { eta_minutes: 35 } });
    const out = await svc.getPharmacyCapabilities({ id: 'pat-1', role: 'patient' }, 'po-1');
    expect(out).toMatchObject({ amount: 115, currency: 'SAR', eta_minutes: 35 });
    expect(findOne).toHaveBeenCalledWith({ id: 'of-1' }, { projection: { _id: 0, 'fulfillment.eta_minutes': 1 } });
  });

  it('is null when the offer gave none or something that is not a number', async () => {
    for (const offer of [null, {}, { fulfillment: {} }, { fulfillment: { eta_minutes: '35' } }]) {
      const { svc } = make(offer);
      expect((await svc.getPharmacyCapabilities({ id: 'pat-1', role: 'patient' }, 'po-1')).eta_minutes).toBeNull();
    }
  });
});
