import { FinanceSuiteService } from './finance-suite.service';

const mockAgg = jest.fn();
jest.mock('../../../common/reports/report-read', () => ({
  reportAggregate: (...args: unknown[]) => ({ toArray: async () => mockAgg(...args) }),
}));

const service = () => new FinanceSuiteService({ collection: () => ({}) } as any, { write: async () => undefined } as any);

describe('reconciliation on integer halalas (R11 P2 read path)', () => {
  beforeEach(() => mockAgg.mockReset());

  it('the $group stages add whole halalas on both sides', async () => {
    mockAgg.mockResolvedValue([]);
    await service().reconciliation('2026-11-12');
    const stages = mockAgg.mock.calls.map((c) => JSON.stringify(c[2]));
    expect(stages[0]).toContain('$amount_halalas');                      // gateway side
    expect(stages[1]).toContain('$total_price_halalas');                 // platform side, first present field
    expect(stages[1]).toContain('$total_halalas');
  });

  it('converts the grouped halalas to SAR once and the variance is exact', async () => {
    mockAgg.mockImplementation(async (_conn: unknown, collection: string) => {
      if (collection === 'moyasar_payments') return [{ _id: 'lab', total: 30, n: 2 }];           // 0.30 SAR as 30 halalas
      if (collection === 'labbookings') return [{ _id: null, total: 20, n: 1 }];                  // 0.20 SAR
      return [];
    });
    const r: any = await service().reconciliation('2026-11-12');
    expect(r.gateway_total_sar).toBe(0.3);
    expect(r.platform_total_sar).toBe(0.2);
    expect(r.variance_sar).toBe(0.1);                                                              // a double subtraction would give 0.09999999999999998
    expect(r.gateway_rows).toEqual([{ kind: 'lab', total: 0.3, count: 2 }]);
    expect(r.platform_rows).toEqual([{ vertical: 'lab', total: 0.2, n: 1 }]);
  });

  it('a day with nothing on either side reconciles to zero', async () => {
    mockAgg.mockResolvedValue([]);
    const r: any = await service().reconciliation('2026-11-12');
    expect([r.gateway_total_sar, r.platform_total_sar, r.variance_sar]).toEqual([0, 0, 0]);
  });
});
