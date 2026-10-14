/** Q-4: the offer read model carries no constants: two pharmacies with different settings give different values. */
import { PharmacyOfferService } from './pharmacy-offer.service';

const svcWith = (profiles: Record<string, any>) => {
  const svc: any = Object.create(PharmacyOfferService.prototype);
  svc.connection = { collection: () => ({ findOne: async (q: any) => profiles[q.account_id] ?? null }) };
  svc.patientDto = (o: any) => ({ id: o.id });
  return svc;
};
const offer = (pharmacy: string) => ({ id: `off-${pharmacy}`, pharmacy_account_id: pharmacy, status: 'submitted', items: [], version: 1, totals: {} });

describe('Q-4 offer read model', () => {
  it('reads insurance readiness from each pharmacy, never a constant; no COD; no invented ETA', async () => {
    const svc = svcWith({ ph1: { insurance_ready: true }, ph2: { accepted_insurance: [] }, ph3: {} });
    const [a, b, c] = await Promise.all(['ph1', 'ph2', 'ph3'].map((p) => svc.patientDtoAsync(offer(p), {})));
    expect(a.insurance_ready).toBe(true);
    expect(b.insurance_ready).toBe(false);
    expect(c.insurance_ready).toBeNull();
    for (const o of [a, b, c]) {
      expect(o.cod_allowed).toBe(false);
      expect(o.approx_delivery).toEqual({ eta_minutes: null, label_ar: null, label_en: null });
    }
  });
});
