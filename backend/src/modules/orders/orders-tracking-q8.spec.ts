/** Q-8: GET /orders/:id/tracking serves pharmacy orders from pharmacy_orders. */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

const svcWith = (regular: any, pharm: any) => {
  const orderModel: any = { findOne: (q: any) => ({ lean: async () => (q?.id === regular?.id ? regular : null) }) };
  const delModel: any = { findOne: () => ({ lean: async () => null }) };
  const conn: any = { collection: (n: string) => (n === 'pharmacy_orders' ? { findOne: async () => pharm } : { findOne: async () => null }) };
  return new (OrdersService as any)(orderModel, {}, delModel, {}, {}, {}, {}, conn, {}, {}, {}, {});
};

describe('Q-8 pharmacy order tracking', () => {
  const pharmOrder = {
    id: 'ph-1', patient_account_id: 'pat-1', status: 'cash_card_payment_pending',
    fulfillment: 'delivery', totals: { total: 50, currency: 'SAR' },
    delivery: { method: 'delivery', courier_name: 'C', courier_phone: null, courier_eta: null },
  };

  it('returns tracking for the pharmacy order owner, mapped from pharmacy fields', async () => {
    const out: any = await svcWith(null, pharmOrder).getTracking('ph-1', { id: 'pat-1', role: 'patient' });
    expect(out.order_id).toBe('ph-1');
    expect(out.state).toBe('cash_card_payment_pending');
    expect(out.total).toBe(50);
    expect(out.delivery.courier_name).toBe('C');
  });

  it('refuses another user with 403', async () => {
    await expect(svcWith(null, pharmOrder).getTracking('ph-1', { id: 'pat-2', role: 'patient' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('still 404s when in neither collection', async () => {
    await expect(svcWith(null, null).getTracking('missing', { id: 'pat-1', role: 'patient' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
