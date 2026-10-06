// ACCEPTANCE — Q-3 (docs/review/OPENCODE_QUEUE.md, Queue A). Written by the reviewer before
// the fix; the implementing agent makes it pass and may not edit it.
//
// The governed pharmacy states ORDER_BROADCASTING, OFFERS_READY and CO_PAY_PENDING
// (packages/shared-contracts/src/state-machines.ts, PHARMACY_TRANSITIONS) are never produced:
// the patient order view (PharmacyOrderService.detail -> governed_state) is null until an offer
// is selected, and a partial insurance decision whose co-pay the patient accepted still reads
// INSURANCE_DECISION_READY. Clients then fall back to guessing from the raw status.
//
// Required behaviour of GET /patient/pharmacy/orders/:id (PharmacyOrderService.detail), with
// documents shaped exactly as the real flow writes them (broadcast start, offer submit, offer
// selection, insurance decision, patient co-pay acceptance, payment finalisation):
//   - broadcasting, no live offer for this order            -> ORDER_BROADCASTING
//   - broadcasting, >= 1 live offer (submitted, not expired) -> OFFERS_READY
//     (draft, expired, cancelled offers and other orders' offers do not count;
//      an offer that expires turns the order back to ORDER_BROADCASTING)
//   - partial decision, co-pay not yet accepted              -> INSURANCE_DECISION_READY (unchanged)
//   - partial decision, patient accepted the co-pay, unpaid  -> CO_PAY_PENDING
//   - ... and once the co-pay is paid (payment_status paid)  -> CONFIRMED
//   - every governed step above is a transition PHARMACY_TRANSITIONS allows.
// The existing states (OFFER_SELECTED, INSURANCE_PROCESSING, fulfilment states) stay as they are.
import { Test } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PharmacyOrderService } from '../../src/modules/pharmacy/services/pharmacy-order.service';
import { PharmacyOrderRepository } from '../../src/modules/pharmacy/services/repositories/pharmacyorder.repository';
import { PharmacyAllocationRepository } from '../../src/modules/pharmacy/services/repositories/pharmacyallocation.repository';
import { PharmacyBroadcastRepository } from '../../src/modules/pharmacy/services/repositories/pharmacybroadcast.repository';
import { PHARMACY_SCHEMAS } from '../../src/modules/pharmacy/schemas/pharmacy.schema';
import { SmartSplitService } from '../../src/modules/pharmacy/services/smart-split.service';
import { PharmacyNotificationService } from '../../src/modules/pharmacy/services/pharmacy-notification.service';
import { PharmacyBroadcastService } from '../../src/modules/pharmacy/services/pharmacy-broadcast.service';
import { EventBusService } from '../../src/modules/events/event-bus.service';
import { WorkflowEngineService } from '../../src/modules/workflow-engine/workflow-engine.module';
import { PHARMACY_TRANSITIONS, PharmacyOrderState as G } from '../../../packages/shared-contracts/src/state-machines';

jest.setTimeout(120_000);

const PATIENT = { id: 'pat-1', role: 'patient' };
const MIN = 60_000;

describe('Q-3: governed pharmacy states ORDER_BROADCASTING, OFFERS_READY, CO_PAY_PENDING', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: PharmacyOrderService;

  const orderDoc = (id: string, extra: Record<string, unknown> = {}) => ({
    id, patient_account_id: PATIENT.id, status: 'broadcasting', payment_method: 'card', fulfillment: 'delivery',
    items: [{ id: `${id}-i1`, sku: 'SKU-1', name: 'Paracetamol 500mg', qty: 1 }],
    totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
    timeline: [{ ts: new Date(), event: 'created' }, { ts: new Date(), event: 'submitted_by_patient' }, { ts: new Date(), event: 'broadcasting_round_1', meta: { radius: 3 } }],
    createdAt: new Date(), updatedAt: new Date(), ...extra,
  });
  const offerDoc = (id: string, orderId: string, status: string, expiresInMin: number, extra: Record<string, unknown> = {}) => ({
    id, order_id: orderId, broadcast_id: `bc-${orderId}`, patient_account_id: PATIENT.id, pharmacy_account_id: 'pharm-1',
    status, version: 1, items: [{ order_item_id: `${orderId}-i1`, sku: 'SKU-1', qty: 1, unit_price: 20 }],
    totals: { subtotal: 20, delivery_fee: 5, total: 25, currency: 'SAR' },
    quote_expires_at: new Date(Date.now() + expiresInMin * MIN),
    submitted_at: status === 'draft' ? undefined : new Date(), createdAt: new Date(), updatedAt: new Date(), ...extra,
  });
  // An insurance order after selectByPatient + decide() (partial: the insurer pays 60 of 100).
  const insuredDoc = (id: string, acceptance?: Record<string, unknown>, extra: Record<string, unknown> = {}) => orderDoc(id, {
    status: 'waiting_copay', payment_method: 'insurance', coverage_mode: 'insurance',
    selected_offer_id: `off-${id}`, selected_offer_version: 1, selected_allocation_id: `al-${id}`,
    totals: { subtotal: 100, delivery_fee: 0, total: 100, currency: 'SAR' },
    pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: 100, delivery_fee: 0, total: 100, currency: 'SAR' }, hash: 'a'.repeat(64), captured_at: new Date() },
    insurance_decision: {
      outcome: 'partial', approval_reference: 'APR-1', offer_id: `off-${id}`, offer_version: 1, allocation_id: `al-${id}`,
      quote_total: 100, insurer_share: 60, patient_share: 40, currency: 'SAR',
      items: [{ order_item_id: `${id}-i1`, quoted_qty: 1, approved_qty: 1, outcome: 'partial', reason: 'limit', unit_price: 100, insurer_share: 60 }],
      idempotency_key: 'decision-key-0000001', decided_by: 'pharm-1', decided_at: new Date(),
      ...(acceptance ? { patient_acceptance: acceptance } : {}),
    },
    ...extra,
  });
  const coPay = { kind: 'co-pay', payment_method: 'card', idempotency_key: 'copay-key-00000001', accepted_at: new Date() };

  const governed = async (id: string) => ((await svc.detail(PATIENT, id)) as { governed_state?: string | null }).governed_state ?? null;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongo.getUri(), { dbName: 'q3' }), MongooseModule.forFeature(PHARMACY_SCHEMAS)],
      providers: [
        PharmacyOrderService,
        { provide: 'PharmacyOrderRepository', useClass: PharmacyOrderRepository },
        { provide: 'PharmacyAllocationRepository', useClass: PharmacyAllocationRepository },
        { provide: 'PharmacyBroadcastRepository', useClass: PharmacyBroadcastRepository },
        // Not used by detail(); the order view must not need them.
        { provide: SmartSplitService, useValue: {} },
        { provide: PharmacyNotificationService, useValue: {} },
        { provide: PharmacyBroadcastService, useValue: {} },
        { provide: EventBusService, useValue: { emit: async () => undefined } },
        { provide: WorkflowEngineService, useValue: {} },
      ],
    }).compile();
    svc = moduleRef.get(PharmacyOrderService);
    conn = moduleRef.get<Connection>(getConnectionToken());

    const orders = conn.collection('pharmacy_orders');
    const offers = conn.collection('pharmacy_offers');
    await orders.insertMany([
      orderDoc('o-none'),
      orderDoc('o-dead-offers'),
      orderDoc('o-live'),
      orderDoc('o-expiring'),
      insuredDoc('o-decided'),
      insuredDoc('o-copay', coPay),
      insuredDoc('o-copay-paid', coPay, { payment_status: 'paid', transaction_id: 'txn-1', paid_at: new Date() }),
      // already selected, card: unchanged behaviour
      orderDoc('o-selected', {
        status: 'cash_card_payment_pending', selected_offer_id: 'off-sel', selected_offer_version: 1,
        pricing_snapshot: { offer_id: 'off-sel', offer_version: 1, totals: { subtotal: 20, delivery_fee: 5, total: 25, currency: 'SAR' }, hash: 'b'.repeat(64), captured_at: new Date() },
      }),
    ]);
    await offers.insertMany([
      // o-none: a live offer, but for ANOTHER order
      offerDoc('off-other', 'o-live', 'submitted', 9),
      // o-dead-offers: nothing selectable
      offerDoc('off-d1', 'o-dead-offers', 'draft', 9),
      offerDoc('off-d2', 'o-dead-offers', 'submitted', -1),
      offerDoc('off-d3', 'o-dead-offers', 'expired', -5, { expired_at: new Date() }),
      offerDoc('off-d4', 'o-dead-offers', 'cancelled', 9),
      // o-expiring: live for a few more seconds only
      offerDoc('off-x1', 'o-expiring', 'submitted', 0.1),
    ]);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('broadcasting with no live offer for this order -> ORDER_BROADCASTING', async () => {
    expect(await governed('o-none')).toBe(G.ORDER_BROADCASTING);
  });

  it('draft, expired, cancelled and past-expiry offers do not make offers ready', async () => {
    expect(await governed('o-dead-offers')).toBe(G.ORDER_BROADCASTING);
  });

  it('broadcasting with a live submitted offer -> OFFERS_READY', async () => {
    expect(await governed('o-live')).toBe(G.OFFERS_READY);
  });

  it('when the only live offer expires the order is back to ORDER_BROADCASTING', async () => {
    expect(await governed('o-expiring')).toBe(G.OFFERS_READY);
    await new Promise((r) => setTimeout(r, 6_500));
    expect(await governed('o-expiring')).toBe(G.ORDER_BROADCASTING);
  });

  it('a partial decision before the patient answers stays INSURANCE_DECISION_READY', async () => {
    expect(await governed('o-decided')).toBe(G.INSURANCE_DECISION_READY);
  });

  it('a partial decision whose co-pay the patient accepted, not yet paid -> CO_PAY_PENDING', async () => {
    expect(await governed('o-copay')).toBe(G.CO_PAY_PENDING);
  });

  it('once the co-pay is paid the order leaves CO_PAY_PENDING for CONFIRMED', async () => {
    expect(await governed('o-copay-paid')).toBe(G.CONFIRMED);
  });

  it('a selected card order keeps its current governed state (no regression)', async () => {
    expect(await governed('o-selected')).toBe(G.OFFER_SELECTED);
  });

  it('every governed step the patient sees is a transition the shared state machine allows', () => {
    const allowed = (from: G, to: G) => PHARMACY_TRANSITIONS.some(([f, t]) => f === from && t === to);
    expect(allowed(G.ORDER_BROADCASTING, G.OFFERS_READY)).toBe(true);
    expect(allowed(G.OFFERS_READY, G.OFFER_SELECTED)).toBe(true);
    expect(allowed(G.INSURANCE_DECISION_READY, G.CO_PAY_PENDING)).toBe(true);
    expect(allowed(G.CO_PAY_PENDING, G.CONFIRMED)).toBe(true);
  });

  it('another patient still cannot read the order', async () => {
    await expect(svc.detail({ id: 'pat-2', role: 'patient' }, 'o-live')).rejects.toMatchObject({ status: 403 });
  });
});
