import { AgentToolsService } from './agent-tools.service';

const PRINCIPAL = { patient_id: 'pat-a', client_id: 'client-1', session_id: 's1', scopes: ['agent:read', 'agent:order', 'agent:book'] };

function mocks() {
  const idem = new Map<string, any>();
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'medicines') {
        return {
          find: jest.fn(() => ({
            toArray: jest.fn(async () => [
              { id: 'med-otc', name_ar: 'بنادول', name_en: 'Panadol', price: 12, requires_prescription: false, controlled: false },
              { id: 'med-rx', name_ar: 'أوجمنتين', name_en: 'Augmentin', price: 80, requires_prescription: true, controlled: false },
            ]),
          })),
        };
      }
      if (name === 'agent_idempotency_keys') {
        return {
          findOne: jest.fn(async (f: any) => idem.get(`${f.patient_id}|${f.client_id}|${f.tool}|${f.key}`) ?? null),
          insertOne: jest.fn(async (d: any) => {
            const k = `${d.patient_id}|${d.client_id}|${d.tool}|${d.key}`;
            if (idem.has(k)) throw { code: 11000 };
            idem.set(k, d);
            return {};
          }),
        };
      }
      return { findOne: jest.fn(async () => null), insertOne: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) };
    }),
  };
  const svc = {
    pharmacyOrders: {
      create: jest.fn(async (_u: any, b: any) => ({ id: 'ord-1', status: 'DRAFT', items: b.items })),
      submit: jest.fn(async () => ({ id: 'ord-1', status: 'READY_FOR_SPLIT' })),
      list: jest.fn(async () => []),
    },
    pharmacyOffers: { listForPatient: jest.fn(async () => []) },
    care: { doctorSlots: jest.fn(async () => ({ slots: [] })) },
    appts: { create: jest.fn(), cancel: jest.fn(), listMine: jest.fn(async () => []) },
    locks: { reserve: jest.fn(), releaseQuietly: jest.fn(async () => ({})) },
    labs: { book: jest.fn(), cancel: jest.fn(), getBooking: jest.fn() },
    radiology: { book: jest.fn(async (_u: any, b: any) => ({ id: 'rad-1', scheduled_at: b.scheduled_at })), cancel: jest.fn(), getBooking: jest.fn() },
    nursing: { book: jest.fn(), cancel: jest.fn(), getBooking: jest.fn() },
    users: { getPatientProfile: jest.fn(async () => ({ addresses: [{ id: 'a1', label: 'home', city: 'Jeddah', lat: 21.5, lng: 39.1 }] })) },
    redis: { getClient: jest.fn(() => null) },
  };
  const service = new AgentToolsService(
    svc.pharmacyOrders as any, svc.pharmacyOffers as any, svc.care as any, svc.appts as any,
    svc.locks as any, svc.labs as any, svc.nursing as any, svc.users as any, svc.redis as any, conn, (svc as any).radiology as any,
  );
  return { svc, service };
}

describe('AgentToolsService (AC-3)', () => {
  it('refuses a whole request with one Rx line before creating anything', async () => {
    const { svc, service } = mocks();
    const out: any = await service.dispatch(
      'create_pharmacy_request',
      { idempotency_key: 'k-rx', items: [{ medicine_id: 'med-otc', qty: 1 }, { medicine_id: 'med-rx', qty: 1 }] },
      PRINCIPAL as any, 1,
    );
    expect(out.error.data.error_code).toBe('RX_VERIFICATION_REQUIRED');
    expect(JSON.stringify(out.error.data)).toMatch(/prescription/i);
    expect(JSON.stringify(out.error.data)).toMatch(/consultation/i);
    expect(svc.pharmacyOrders.create).not.toHaveBeenCalled();
  });

  it('creates + submits an OTC-only request and replays the same key without a second order', async () => {
    const { svc, service } = mocks();
    const args = { idempotency_key: 'k-otc', items: [{ medicine_id: 'med-otc', qty: 2 }], address_id: 'a1' };
    const first: any = await service.dispatch('create_pharmacy_request', args, PRINCIPAL as any, 1);
    const second: any = await service.dispatch('create_pharmacy_request', args, PRINCIPAL as any, 2);
    expect(first.result.structuredContent.order_id).toBe('ord-1');
    expect(second.result.structuredContent.order_id).toBe('ord-1');
    expect(svc.pharmacyOrders.create).toHaveBeenCalledTimes(1);
    expect(svc.pharmacyOrders.submit).toHaveBeenCalledTimes(1);
    expect(first.result.structuredContent.tracking_url).toContain('ord-1');
  });

  it('refuses a write without idempotency_key and an unknown medicine', async () => {
    const { svc, service } = mocks();
    const nokey: any = await service.dispatch('create_pharmacy_request', { items: [{ medicine_id: 'med-otc', qty: 1 }] }, PRINCIPAL as any, 1);
    expect(nokey.error.data.error_code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const unknown: any = await service.dispatch(
      'create_pharmacy_request', { idempotency_key: 'k-x', items: [{ medicine_id: 'nope', qty: 1 }] }, PRINCIPAL as any, 2,
    );
    expect(unknown.error.data.error_code).toBe('MEDICINE_NOT_FOUND');
    expect(svc.pharmacyOrders.create).not.toHaveBeenCalled();
  });

  it('cancel_hold refuses a hold another client created without touching the booking service', async () => {
    const { svc, service } = mocks();
    const out: any = await service.dispatch('cancel_hold', { idempotency_key: 'k-c', booking_id: 'b1' }, PRINCIPAL as any, 1);
    expect(out.error.data.error_code).toBe('CANCEL_NOT_ALLOWED');
    expect(svc.appts.cancel).not.toHaveBeenCalled();
  });

  it('answers unknown tools with UNKNOWN_TOOL', async () => {
    const { service } = mocks();
    const out: any = await service.dispatch('teleport', {}, PRINCIPAL as any, 1);
    expect(out.error.data.error_code).toBe('UNKNOWN_TOOL');
  });

  it('consultation_slots stays public through dispatchPublic', async () => {
    const { svc, service } = mocks();
    svc.care.doctorSlots.mockResolvedValue({ slots: [{ start: '2026-10-20T06:00:00.000Z', available: true }] });
    const out: any = await service.dispatchPublic('consultation_slots', { doctor_id: 'd', date: '2026-10-20', mode: 'video' }, 1);
    expect(out.result.structuredContent.slots).toHaveLength(1);
    const bad: any = await service.dispatchPublic('my_orders', {}, 2);
    expect(bad.error.data.error_code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('hold_radiology books card-unpaid through the radiology service and returns the Nabd checkout link', async () => {
    const { svc, service } = mocks();
    const out: any = await service.dispatch(
      'hold_radiology',
      { idempotency_key: 'k-r', service_id: 'xr-chest', provider_account_id: 'ctr-1', scheduled_at: '2099-01-01T07:00:00.000Z' },
      PRINCIPAL as any, 1,
    );
    expect(svc.radiology.book).toHaveBeenCalledWith(
      { id: 'pat-a', role: 'patient' },
      expect.objectContaining({ service_id: 'xr-chest', provider_account_id: 'ctr-1', payment_method: 'card' }),
    );
    expect(out.result.structuredContent.checkout_url).toBe('https://nabd.plus/ar/diagnostics/bookings/radiology/rad-1');
    expect(out.result.structuredContent.payment_url).toBe(out.result.structuredContent.checkout_url);
    const missing: any = await service.dispatch('hold_radiology', { idempotency_key: 'k-r2', service_id: 'xr' }, PRINCIPAL as any, 2);
    expect(missing.error.data.error_code).toBe('INVALID_PARAMS');
  });

  it('an OTC cart request returns a checkout_url the patient opens to pick an offer and pay', async () => {
    const { service } = mocks();
    const out: any = await service.dispatch(
      'create_pharmacy_request', { idempotency_key: 'k-cart', items: [{ medicine_id: 'med-otc', qty: 3 }] }, PRINCIPAL as any, 1,
    );
    expect(out.result.structuredContent.checkout_url).toContain('/ar/pharmacy/broadcast-status?orderId=ord-1');
  });
});
