import { halalasSum, reportFigures } from './report-totals';

describe('reportFigures (R11 P2: the finance summary adds whole halalas)', () => {
  const payments = [
    { _id: 'paid', total: 12345, count: 3 },          // 123.45 SAR
    { _id: 'refunded', total: 5000, count: 1 },       // 50.00
    { _id: 'failed', total: 999, count: 2 },          // 9.99
  ];
  const ledger = [
    { _id: { type: 'commission_reversal', state: 'settled' }, total: 120, count: 1 },
    { _id: { type: 'vat_reversal', state: 'settled' }, total: 18, count: 1 },
    { _id: { type: 'chargeback' }, total: 700, count: 1 },
    { _id: { type: 'provider_earning', state: 'pending' }, total: 8000, count: 2 },
    { _id: { type: 'provider_earning', state: 'cleared' }, total: 4000, count: 1 },
    { _id: { type: 'payout' }, total: 2500, count: 1 },
    { _id: { type: 'provider_debit' }, total: 333, count: 1 },
  ];
  const refunds = [
    { _id: 'COMPLETED', total: 3000, count: 2 },
    { _id: 'completed', total: 1000, count: 1 },     // the same state spelled in lower case counts too
    { _id: 'REQUESTED', total: 9999, count: 4 },
  ];
  const earnings = { commission: 1500, vat: 225, gross: 10000, net: 8500 };

  it('turns the halala sums into SAR once, at the end', () => {
    const f = reportFigures(payments, ledger, refunds, earnings);
    expect(f.gross_revenue).toBe(173.45);
    expect(f.paid_count).toBe(3);
    expect(f.failed_count).toBe(2);
    expect(f.failed_volume).toBe(9.99);
    expect(f.commission).toBe(13.8);                  // 15.00 - 1.20
    expect(f.vat_on_commission).toBe(2.07);           // 2.25 - 0.18
    expect(f.net_revenue).toBe(15.87);
    expect(f.provider_net).toBe(85);
    expect(f.refunds_completed).toBe(40);             // both spellings of COMPLETED
    expect(f.refunds_requested_count).toBe(7);
    expect(f.chargebacks).toBe(7);
    expect(f.provider_pending_escrow).toBe(80);
    expect(f.provider_settled).toBe(25);
    expect(f.provider_debits).toBe(3.33);
  });

  it('a day of 0.1 + 0.2 payments adds up exactly (10 + 20 halalas, not 0.30000000000000004)', () => {
    const f = reportFigures([{ _id: 'paid', total: 10 + 20, count: 2 }], [], [], {});
    expect(f.gross_revenue).toBe(0.3);
  });

  it('an empty period is all zeros and never NaN', () => {
    const f = reportFigures([], [], [], {});
    for (const [k, v] of Object.entries(f)) expect([k, Number.isFinite(v)]).toEqual([k, true]);
    expect(f.gross_revenue).toBe(0);
    expect(f.net_revenue).toBe(0);
  });

  it('missing totals and counts count as zero', () => {
    const f = reportFigures([{ _id: 'paid' }], [{ _id: { type: 'payout' } }], [{ _id: 'COMPLETED' }], { commission: undefined });
    expect(f.gross_revenue).toBe(0);
    expect(f.provider_settled).toBe(0);
    expect(f.refunds_completed).toBe(0);
    expect(f.paid_count).toBe(0);
  });
});

describe('halalasSum (the $group accumulator)', () => {
  it('reads the integer shadow first and falls back on the double times 100, rounded to a halala, for rows without one', () => {
    expect(halalasSum('amount')).toEqual({
      $sum: { $ifNull: ['$amount_halalas', { $toLong: { $round: [{ $multiply: ['$amount', 100] }, 0] } }] },
    });
    expect(JSON.stringify(halalasSum('refund_amount'))).toContain('$refund_amount_halalas');
  });
});
