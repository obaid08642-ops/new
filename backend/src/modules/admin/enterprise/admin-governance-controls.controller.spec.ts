import { AdminGovernanceControlsController, PublicContentController } from './admin-governance-controls.controller';

describe('PublicContentController home (R6-5)', () => {
  it('serves only enabled sections in position order', async () => {
    const conn: any = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          key: 'primary', version: 3,
          sections: [
            { id: 'b', position: 2, enabled: true, items: [] },
            { id: 'a', position: 1, enabled: false, items: [] },
            { id: 'c', position: 0, enabled: true, items: [] },
          ],
        }),
      }),
    };
    const res: any = await new PublicContentController(conn).home();
    expect(res.sections.map((s: any) => s.id)).toEqual(['c', 'b']);
    expect(res.version).toBe(3);
  });

  it('returns an empty section list when nothing is curated', async () => {
    const conn: any = { collection: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }) };
    await expect(new PublicContentController(conn).home()).resolves.toEqual(
      expect.objectContaining({ sections: [] }),
    );
  });
});

describe('AdminGovernanceControlsController', () => {
  let controller: AdminGovernanceControlsController;

  const mockAudit = {
    write: jest.fn().mockResolvedValue(true),
  } as any;

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'query_analytics') {
        return {
aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
            const group = pipeline.find((st: any) => st.$group)?.$group || {};
            const rows = group._id === null ? [{ _id: null, total: 10, zero: 2 }]
              : group._id === '$specialty' ? [{ _id: 'dermatology', count: 3 }]
              : group._id === '$resolved_location_code' ? [{ _id: 'riyadh', count: 4 }]
              : [{ _id: { q: 'طبيب جلدية في الرياض', locale: 'ar' }, raw_query: 'طبيب جلدية في الرياض', intent_type: 'discovery', count: 5, zero: 1 }];
            return { toArray: jest.fn().mockResolvedValue(rows) };
          }),
        };
      }
      if (name === 'medicine_price_history') {
        return {
          countDocuments: jest.fn().mockResolvedValue(1),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                project: jest.fn().mockReturnValue({
                  toArray: jest.fn().mockResolvedValue([
                    {
                      medicine_id: 'med-1',
                      old_price: 15.0,
                      new_price: 18.5,
                      reason: 'SFDA annual price adjustment',
                      createdAt: new Date(),
                    },
                  ]),
                }),
              }),
              }),
            }),
          }),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              { total_overrides: 1, flagged_overpriced: 0, avg_variance_pct: 23.3 },
            ]),
          }),
        };
      }
      if (name === 'ai_checkout_sessions') {
        return {
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                project: jest.fn().mockReturnValue({
                  toArray: jest.fn().mockResolvedValue([
                    {
                      session_id: 'ai_chk_123',
                      requires_prescription: false,
                      status: 'ready_for_patient_handoff',
                      pricing: { total_sar: 38.06 },
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      }
      if (name === 'conditions' || name === 'medicines' || name === 'provider_profiles' || name === 'facilities' || name === 'locations') {
        return {
          countDocuments: jest.fn().mockResolvedValue(100),
        };
      }
      return {
        findOne: jest.fn().mockResolvedValue(null),
        updateOne: jest.fn().mockResolvedValue({}),
      };
    }),
  } as any;

  beforeEach(() => {
    controller = new AdminGovernanceControlsController(mockConnection, mockAudit);
  });

  it('searchIntentAnalytics returns query metrics and top queries', async () => {
    const res = await controller.searchIntentAnalytics();
    expect(res.total_queries).toBe(10);
    expect(res.no_results_queries).toBe(2);
    expect(res.zero_result_rate).toBe(20);
    expect(res.top_queries).toHaveLength(1);
    expect(res.top_queries[0].raw_query).toBe('طبيب جلدية في الرياض');
    expect(res.zero_result_queries).toHaveLength(1);
    expect(res.top_specialties).toEqual([{ specialty: 'dermatology', count: 3 }]);
    expect(res.top_locations).toEqual([{ location: 'riyadh', count: 4 }]);
  });

  it('searchIntentAnalytics never lets a query-string object become a Mongo operator', async () => {
    await controller.searchIntentAnalytics({ $ne: 'x' } as any);
    const used = mockConnection.collection.mock.results.map((r: any) => r.value).filter((v: any) => v?.aggregate?.mock?.calls?.length);
    const match = used.at(-1).aggregate.mock.calls[0][0][0].$match;
    expect(match.locale).toEqual({ $eq: '[object Object]' });
  });

  it('medicinePriceHistory returns audit records of price changes', async () => {
    const res = await controller.medicinePriceHistory();
    expect(res.total).toBe(1);
    expect(res.data[0].old_price).toBe(15.0);
    expect(res.data[0].new_price).toBe(18.5);
    expect(res.summary.total_overrides).toBe(1);
  });

  it('mcpAuditLogs returns AI agent checkout sessions', async () => {
    const res = await controller.mcpAuditLogs();
    expect(res.total_sessions).toBe(1);
    expect(res.sessions[0].session_id).toBe('ai_chk_123');
    expect(res.sessions[0].pricing.total_sar).toBe(38.06);
  });

  it('entityGraphStats returns node counts across all healthcare domains', async () => {
    const res = await controller.entityGraphStats();
    expect(res.nodes.conditions).toBe(100);
    expect(res.nodes.medicines).toBe(100);
    expect(res.nodes.doctors).toBe(100);
    expect(res.nodes.facilities).toBe(100);
    expect(res.nodes.total_nodes).toBe(500);
    expect(res.graph_status).toBe('healthy');
  });
});
