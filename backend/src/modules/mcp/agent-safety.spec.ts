import { AgentToolsService } from './agent-tools.service';

const PRINCIPAL = { patient_id: 'pat-a', client_id: 'client-1', session_id: 's1', scopes: ['agent:read', 'agent:order', 'agent:book'] };

function mocks() {
  const counts = new Map<string, number>();
  const conn: any = {
    collection: jest.fn(() => ({
      findOne: jest.fn(async () => null),
      insertOne: jest.fn(async () => ({})),
      updateOne: jest.fn(async () => ({})),
    })),
  };
  const svc = {
    pharmacyOrders: { list: jest.fn(async () => []) },
    pharmacyOffers: { listForPatient: jest.fn(async () => []) },
    care: { doctorSlots: jest.fn(async () => ({ slots: [] })) },
    appts: { listMine: jest.fn(async () => []) },
    locks: {},
    labs: {},
    nursing: {},
    users: { getPatientProfile: jest.fn(async () => ({ addresses: [] })) },
    redis: {
      getClient: jest.fn(() => ({
        incr: jest.fn(async (k: string) => { const n = (counts.get(k) ?? 0) + 1; counts.set(k, n); return n; }),
        expire: jest.fn(async () => 1),
      })),
    },
  };
  const service = new AgentToolsService(
    svc.pharmacyOrders as any, svc.pharmacyOffers as any, svc.care as any, svc.appts as any,
    svc.locks as any, svc.labs as any, svc.nursing as any, svc.users as any, svc.redis as any, conn,
  );
  return { svc, service };
}

describe('AgentToolsService safety (AC-6)', () => {
  it('blocks the 31st call in a minute per client and patient', async () => {
    const { service } = mocks();
    for (let i = 0; i < 30; i++) {
      const r: any = await service.dispatch('my_orders', {}, PRINCIPAL as any, i);
      expect(r.result).toBeDefined();
    }
    const limited: any = await service.dispatch('my_orders', {}, PRINCIPAL as any, 31);
    expect(limited.error.data.error_code).toBe('RATE_LIMITED');
  });

  it('blocks the 11th write in an hour per patient', async () => {
    const { service } = mocks();
    for (let i = 0; i < 10; i++) {
      const r: any = await service.dispatch('cancel_hold', { idempotency_key: `k-${i}`, booking_id: 'b1' }, PRINCIPAL as any, i);
      expect(r.error.data.error_code).toBe('CANCEL_NOT_ALLOWED');
    }
    const limited: any = await service.dispatch('cancel_hold', { idempotency_key: 'k-10', booking_id: 'b1' }, PRINCIPAL as any, 10);
    expect(limited.error.data.error_code).toBe('RATE_LIMITED');
  });

  it('answers failures with codes, never stack traces or storage internals', async () => {
    const { svc, service } = mocks();
    svc.pharmacyOrders.list.mockRejectedValueOnce(
      new Error('E11000 duplicate key: { patient_id: "pat-x", order: 1 }\n    at Collection.insertOne (/db.js:10:5)'),
    );
    const out: any = await service.dispatch('my_orders', {}, PRINCIPAL as any, 1);
    expect(out.error.data.error_code).toBe('TOOL_FAILED');
    expect(out.error.message).toBe('tool_failed');
    expect(JSON.stringify(out)).not.toContain('pat-x');
    expect(JSON.stringify(out)).not.toContain('at Collection');
    expect(JSON.stringify(out)).not.toContain('stack');
  });
});
