import { earningRecord, earningsPipeline, foldPlatformSummary, foldProviderSummary, halalasOf, providerTypeOf, reversalsPipeline } from './commission-summary';

describe('commission KPIs from the real ledger (screens-audit-3 gap 23)', () => {
  // halala sums per ref_type, as the aggregation returns them
  const earnings = [
    { _id: 'appointment', gross: 30000, commission: 4500, vat: 675, net: 24825, count: 3 },         // 300.00 / 45.00 / 6.75
    { _id: 'lab_booking', gross: 10000, commission: 1000, vat: 150, net: 8850, count: 1 },
    { _id: null, gross: 500, commission: 50, vat: 8, net: 442, count: 1 },                           // an old row with no ref_type
  ];

  it('adds commission and VAT per service and in total, in SAR, net of nothing when nothing was refunded', () => {
    const r = foldPlatformSummary(earnings, []);
    expect(r.total_commission).toBe(55.5);
    expect(r.total_vat_on_commission).toBe(8.33);
    expect(r.by_service).toEqual([
      { _id: 'appointment', gross: 300, commission: 45, vat_on_commission: 6.75, count: 3 },
      { _id: 'lab_booking', gross: 100, commission: 10, vat_on_commission: 1.5, count: 1 },
      { _id: 'unknown', gross: 5, commission: 0.5, vat_on_commission: 0.08, count: 1 },
    ]);
  });

  it('what refunds took back is subtracted from the service it belongs to and from the total', () => {
    const reversals = [
      { _id: { service: 'appointment', type: 'commission_reversal' }, total: 2250 },
      { _id: { service: 'appointment', type: 'vat_reversal' }, total: 338 },
      { _id: { service: 'unknown', type: 'commission_reversal' }, total: 50 },
    ];
    const r = foldPlatformSummary(earnings, reversals);
    const by = (id: string) => r.by_service.find((x) => x._id === id)!;
    expect(by('appointment').commission).toBe(22.5);
    expect(by('appointment').vat_on_commission).toBe(3.37);
    expect(by('lab_booking').commission).toBe(10);
    expect(by('unknown').commission).toBe(0);
    expect(r.total_commission).toBe(32.5);
  });

  it('a reversal whose earning cannot be found still counts, under unknown', () => {
    const r = foldPlatformSummary([], [{ _id: { service: 'unknown', type: 'commission_reversal' }, total: 100 }]);
    expect(r.by_service).toEqual([{ _id: 'unknown', gross: 0, commission: -1, vat_on_commission: 0, count: 0 }]);
    expect(r.total_commission).toBe(-1);
  });

  it('an empty ledger is all zeros, never NaN', () => {
    expect(foldPlatformSummary([], [])).toEqual({ total_commission: 0, total_vat_on_commission: 0, by_service: [] });
    expect(foldProviderSummary([])).toEqual({ gross: 0, commission: 0, net: 0, count: 0 });
    expect(foldProviderSummary([{ _id: 'x', gross: undefined, count: NaN } as any])).toEqual({ gross: 0, commission: 0, net: 0, count: 0 });
  });

  it('a provider summary adds that provider\'s earnings: what they sold, what the platform took, their net, the count', () => {
    expect(foldProviderSummary(earnings)).toEqual({ gross: 405, commission: 55.5, net: 341.17, count: 5 });
  });

  it('halalas add exactly (0.1 + 0.2 + 0.3 as 10 + 20 + 30 halalas)', () => {
    expect(foldProviderSummary([{ _id: 'a', gross: 10 + 20 + 30, count: 3 }]).gross).toBe(0.6);
  });
});

describe('the aggregation pipelines', () => {
  it('earnings: only provider_earning rows, optionally of the given account ids, grouped by ref_type, adding the halala shadow first', () => {
    const all: any[] = earningsPipeline();
    expect(all[0]).toEqual({ $match: { type: 'provider_earning' } });
    expect(all[1].$group._id).toBe('$ref_type');
    expect(all[1].$group.gross).toEqual({ $sum: halalasOf('gross') });
    expect(halalasOf('gross')).toEqual({ $ifNull: ['$gross_halalas', { $toLong: { $round: [{ $multiply: ['$gross', 100] }, 0] } }] });
    const one: any[] = earningsPipeline(['acc1', 'u1']);
    expect(one[0]).toEqual({ $match: { type: 'provider_earning', provider_account_id: { $in: ['acc1', 'u1'] } } });
  });

  it('reversals: commission and VAT reversals, joined to their earning through meta.earning_id', () => {
    const p: any[] = reversalsPipeline();
    expect(p[0].$match.type.$in).toEqual(['commission_reversal', 'vat_reversal']);
    expect(p[1].$lookup).toMatchObject({ from: 'platformledgerentries', localField: 'meta.earning_id', foreignField: 'id' });
  });
});

describe('the per-transaction commission list', () => {
  it('an earning row becomes a record with the legacy field names the admin page reads', () => {
    const rec = earningRecord({ id: 'e1', provider_account_id: 'acc1', ref_type: 'appointment', ref_id: 'a1', gross: 200, commission: 30, vat: 4.5, amount: 165.5, commission_percent: 15, createdAt: new Date('2026-11-01') }, 'Dr Sara');
    expect(rec).toMatchObject({ id: 'e1', providerId: 'acc1', providerName: 'Dr Sara', providerType: 'doctor', refType: 'appointment', refId: 'a1', baseBill: 200, systemCommission: 30, vatOnCommission: 4.5, providerEarning: 165.5, commissionPercent: 15 });
  });

  it('provider type from what was served; unknown kinds keep their own name', () => {
    expect(providerTypeOf('appointment')).toBe('doctor');
    expect(providerTypeOf('homecare_booking')).toBe('home_care');
    expect(providerTypeOf('pharmacy_order')).toBe('pharmacy');
    expect(providerTypeOf('lab_booking')).toBe('lab_booking');
    expect(providerTypeOf(undefined)).toBe('unknown');
  });

  it('missing figures are zero', () => {
    expect(earningRecord({ id: 'e2' })).toMatchObject({ baseBill: 0, systemCommission: 0, vatOnCommission: 0, providerEarning: 0 });
  });
});
