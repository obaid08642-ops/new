/** A-2: the patient's offer list — live offers by default, every sent offer with ?include=closed, never a draft. */
import { PharmacyOfferService } from './pharmacy-offer.service';

const past = new Date(Date.now() - 60_000);
const future = new Date(Date.now() + 600_000);
const lean = (v: any) => ({ lean: async () => v, sort: () => ({ lean: async () => v }) });

function svcWith(offers: any[], order: any = {}, broadcast: any = null) {
  const svc: any = Object.create(PharmacyOfferService.prototype);
  const find = jest.fn((q: any) => lean(offers.filter((o) => (q.status?.$ne ? o.status !== q.status.$ne : true))));
  svc.offers = { find };
  svc.orders = { findOne: () => lean({ id: 'ord1', patient_account_id: 'pat1', ...order }) };
  svc.broadcasts = { findOne: () => lean(broadcast) };
  svc.connection = { collection: () => ({ findOne: async () => ({ insurance_ready: true }) }) };
  svc.patientDto = (o: any) => ({ id: o.id });
  return { svc: svc as PharmacyOfferService, find };
}

const offer = (id: string, pharmacy: string, status: string, extra: any = {}) =>
  ({ id, pharmacy_account_id: pharmacy, status, version: 1, items: [], totals: {}, quote_expires_at: future, ...extra });

describe('A-2 patient offer list', () => {
  const user = { id: 'pat1' };

  it('returns only live offers by default, with status open for the clients', async () => {
    const { svc } = svcWith([
      offer('live', 'ph1', 'submitted'),
      offer('late', 'ph2', 'submitted', { quote_expires_at: past }),
      offer('gone', 'ph3', 'cancelled'),
      offer('draft', 'ph4', 'draft'),
    ]);
    const list: any[] = await svc.listForPatient(user, 'ord1');
    expect(list.map((o) => o.id)).toEqual(['live']);
    expect(list[0]).toMatchObject({ status: 'open', offer_state: 'submitted', pharmacy_accepts_insurance: true });
  });

  it('with include=closed returns every sent offer with its state, never a draft', async () => {
    const { svc, find } = svcWith([
      offer('live', 'ph1', 'submitted'),
      offer('late', 'ph2', 'submitted', { quote_expires_at: past }),
      offer('gone', 'ph3', 'cancelled'),
      offer('draft', 'ph4', 'draft'),
    ]);
    const list: any[] = await svc.listForPatient(user, 'ord1', true);
    expect(find.mock.calls[0][0].status).toEqual({ $ne: 'draft' });
    expect(Object.fromEntries(list.map((o) => [o.id, o.status]))).toEqual({ live: 'open', late: 'expired', gone: 'withdrawn' });
  });

  it('journeys 75: each named line carries the price check the website shows', async () => {
    const items = [
      { order_item_id: 'a', name_ar: 'أ', action: 'available', price_check: 'not_verified' },
      { order_item_id: 'b', name_ar: 'ب', action: 'available', above_catalogue_price: true },
      { order_item_id: 'c', name_ar: 'ج', action: 'available', price_check: 'verified' },
    ];
    const { svc } = svcWith([offer('live', 'ph1', 'submitted', { items })]);
    const [row]: any[] = await svc.listForPatient(user, 'ord1');
    expect(row.lines.map((l: any) => l.price_status)).toEqual(['not_verified', 'above_catalogue', 'verified']);
  });

  it('keeps only the latest sent version per pharmacy', async () => {
    const { svc } = svcWith([offer('v2', 'ph1', 'submitted', { version: 2 }), offer('v1', 'ph1', 'cancelled', { version: 1 })]);
    expect((await svc.listForPatient(user, 'ord1', true)).map((o: any) => o.id)).toEqual(['v2']);
  });

  it('marks the chosen offer selected and gives its co-pay only to it', async () => {
    const order = { selected_offer_id: 'chosen', coverage_mode: 'insurance', insurance_decision: { patient_share: 25 } };
    const { svc } = svcWith([offer('chosen', 'ph1', 'selected'), offer('other', 'ph2', 'submitted')], order);
    const list: any[] = await svc.listForPatient(user, 'ord1', true);
    const byId = Object.fromEntries(list.map((o) => [o.id, o]));
    expect(byId.chosen).toMatchObject({ status: 'selected', expected_copay: 25 });
    expect(byId.other).toMatchObject({ status: 'open', expected_copay: null });
  });

  it('passes the broadcast round through as stored, with no invented defaults', async () => {
    const { svc } = svcWith([offer('live', 'ph1', 'submitted')], {}, { current_round: 2 });
    const [o]: any[] = await svc.listForPatient(user, 'ord1');
    expect(o.broadcast).toEqual({ current_round: 2, current_radius_km: null, round_expires_at: null });
  });
});
