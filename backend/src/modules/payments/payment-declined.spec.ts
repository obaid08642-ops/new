import { MoyasarAdapter } from './payments.module';

const res = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

// PT-23: a declined card is reported as failed so the patient can retry; a later paid attempt still settles.
describe('Moyasar verify after a declined card', () => {
  const env = { ...process.env };
  let fetchMock: jest.SpyInstance;
  beforeEach(() => { process.env.MOYASAR_API_KEY = 'sk_test_FIXTURE_NOT_A_REAL_KEY'; process.env.MOYASAR_API_BASE = 'https://api.moyasar.test/v1'; fetchMock = jest.spyOn(global, 'fetch'); });
  afterEach(() => { fetchMock.mockRestore(); process.env = { ...env }; });
  const invoice = (status: string, payments: any[]) => fetchMock.mockResolvedValueOnce(res({ id: 'inv1', status, payments }));

  it('invoice still open, last attempt declined: failed, with the card message', async () => {
    invoice('initiated', [{ id: 'p1', status: 'failed', source: { message: 'DECLINED' } }]);
    const r = await new MoyasarAdapter().verify('inv1');
    expect(r.status).toBe('failed');
    expect((r.raw as any).last_payment_error.message).toBe('DECLINED');
  });

  it('declined once, then paid on the same invoice: paid', async () => {
    invoice('initiated', [{ id: 'p1', status: 'failed' }, { id: 'p2', status: 'paid', amount: 5000 }]);
    const r = await new MoyasarAdapter().verify('inv1');
    expect(r.status).toBe('paid');
    expect(r.charge_id).toBe('p2');
  });

  it('no attempt yet, or an attempt still being authenticated (3-D Secure): pending', async () => {
    invoice('initiated', []);
    expect((await new MoyasarAdapter().verify('inv1')).status).toBe('pending');
    invoice('initiated', [{ id: 'p1', status: 'initiated' }]);
    expect((await new MoyasarAdapter().verify('inv1')).status).toBe('pending');
  });

  it('an invoice the gateway calls failed is failed as before', async () => {
    invoice('failed', []);
    expect((await new MoyasarAdapter().verify('inv1')).status).toBe('failed');
  });

  it('an expired checkout session is failed with its own stable reason (the page says "the session expired, no money was taken")', async () => {
    invoice('expired', []);
    const r = await new MoyasarAdapter().verify('inv1');
    expect(r.status).toBe('failed');
    expect((r.raw as any).last_payment_error.message).toBe('payment_session_expired');
  });

  it('a cancelled invoice is cancelled', async () => {
    invoice('canceled', []);
    expect((await new MoyasarAdapter().verify('inv1')).status).toBe('cancelled');
  });
});
