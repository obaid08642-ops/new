import { AdminGovernanceControlsController } from './admin-governance-controls.controller';

describe('AdminGovernanceControlsController', () => {
  let controller: AdminGovernanceControlsController;

  const mockAudit = {
    write: jest.fn().mockResolvedValue(true),
  } as any;

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'query_analytics') {
        return {
          countDocuments: jest.fn().mockImplementation((filter) => {
            if (filter.results_count === 0) return Promise.resolve(2);
            return Promise.resolve(10);
          }),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              { _id: 'طبيب جلدية في الرياض', count: 5, avgResults: 3 },
            ]),
          }),
        };
      }
      if (name === 'medicine_price_history') {
        return {
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
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
      if (name === 'conditions' || name === 'medicines_master' || name === 'provider_profiles' || name === 'facilities' || name === 'locations') {
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
    expect(res.top_queries[0].query).toBe('طبيب جلدية في الرياض');
  });

  it('medicinePriceHistory returns audit records of price changes', async () => {
    const res = await controller.medicinePriceHistory();
    expect(res.total).toBe(1);
    expect(res.history[0].old_price).toBe(15.0);
    expect(res.history[0].new_price).toBe(18.5);
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
