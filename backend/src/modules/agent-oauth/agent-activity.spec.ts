import { AgentActivityController } from './agent-oauth.controller';
import { AgentOAuthService } from './agent-oauth.service';

const rows = [
  { id: 'm1', tool: 'create_pharmacy_request', ok: true, error_code: null, at: new Date(), actor_type: 'agent', client_id: 'c1', patient_id: 'p1' },
  { id: 'm2', tool: 'my_orders', ok: true, error_code: null, at: new Date(), actor_type: 'agent', client_id: 'c2', patient_id: 'p1' },
  { id: 'm3', tool: 'hold_consultation', ok: false, error_code: 'SLOT_TAKEN', at: new Date(), actor_type: 'agent', client_id: 'c1', patient_id: 'p2' },
];

function matches(row: any, q: any) {
  return Object.entries(q).every(([k, v]) => {
    const want = v !== null && typeof v === 'object' && '$eq' in (v as any) ? (v as any).$eq : v;
    return row[k] === want;
  });
}

function serviceMock() {
  const data = [...rows];
  const conn: any = {
    collection: jest.fn(() => ({
      find: jest.fn((q: any) => {
        const out = data.filter((r) => matches(r, q));
        const chain: any = {
          sort: jest.fn(() => chain),
          skip: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          toArray: jest.fn(async () => out),
        };
        return chain;
      }),
      countDocuments: jest.fn(async (q: any) => data.filter((r) => matches(r, q)).length),
    })),
  };
  return new AgentOAuthService(conn);
}

describe('GET /admin/agent-activity (AC-6)', () => {
  it('lists agent activity with filters by client, patient and tool', async () => {
    const controller = new AgentActivityController(serviceMock());
    const all: any = await controller.list({} as any);
    expect(all.total).toBe(3);
    const byClient: any = await controller.list({ client_id: 'c1' } as any);
    expect(byClient.total).toBe(2);
    expect(byClient.items.every((r: any) => r.client_id === 'c1')).toBe(true);
    const byPatient: any = await controller.list({ patient_id: 'p2' } as any);
    expect(byPatient.total).toBe(1);
    const byTool: any = await controller.list({ tool: 'my_orders' } as any);
    expect(byTool.total).toBe(1);
    expect(byTool.items[0].tool).toBe('my_orders');
  });

  it('caps page size', async () => {
    const controller = new AgentActivityController(serviceMock());
    const r: any = await controller.list({ limit: '5000' } as any);
    expect(r.limit).toBeLessThanOrEqual(200);
  });
});
