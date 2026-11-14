import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderingApprovalService } from './ordering-approval.service';

// M5 decisions: only the booking's provider decides, every item needs a decision, shares are bounded, a booking is decided once.
const LOCK = { quote_id: 'q', home_fee: 30, items: [{ catalog_id: 'cbc', price: 60, coverage: 'needs_approval' }, { catalog_id: 'hba1c', price: 90, coverage: 'needs_approval' }] };
const BOOKING = { id: 'b1', patient_id: 'pat', provider_account_id: 'lab', payment_method: 'insurance', price_lock: LOCK };

function make(booking: unknown = BOOKING, insertError?: { code: number }) {
  const inserted: any[] = [];
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'ordering_approvals') return { insertOne: jest.fn(async (d: any) => { if (insertError) throw insertError; inserted.push(d); }), findOne: jest.fn(async () => null), createIndex: jest.fn() };
      return { findOne: jest.fn(async () => booking) };
    }),
  };
  const labs: any = { applyOrderingDecision: jest.fn(async () => undefined) };
  return { svc: new OrderingApprovalService(conn, labs, {} as never, {} as never), inserted, labs };
}
const both = (a: any, b: any) => ({ decisions: [{ catalog_id: 'cbc', ...a }, { catalog_id: 'hba1c', ...b }] });

describe('M5 item decisions', () => {
  it('another provider is refused, an unknown or non-insured booking is 404', async () => {
    await expect(make().svc.decide({ id: 'other' }, 'b1', both({ decision: 'rejected' }, { decision: 'rejected' }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make(null).svc.decide({ id: 'lab' }, 'x', both({ decision: 'rejected' }, { decision: 'rejected' }))).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ ...BOOKING, payment_method: 'card' }).svc.decide({ id: 'lab' }, 'b1', both({ decision: 'rejected' }, { decision: 'rejected' }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('every item needs a decision; unknown, duplicate and oversized shares are refused', async () => {
    const { svc } = make();
    await expect(svc.decide({ id: 'lab' }, 'b1', { decisions: [{ catalog_id: 'cbc', decision: 'rejected' }] })).rejects.toThrow('decision_missing_for_items');
    await expect(svc.decide({ id: 'lab' }, 'b1', { decisions: [{ catalog_id: 'zzz', decision: 'rejected' }] })).rejects.toThrow('unknown_booking_item');
    await expect(svc.decide({ id: 'lab' }, 'b1', { decisions: [{ catalog_id: 'cbc', decision: 'rejected' }, { catalog_id: 'cbc', decision: 'rejected' }] })).rejects.toThrow('duplicate_decision');
    await expect(svc.decide({ id: 'lab' }, 'b1', both({ decision: 'approved' }, { decision: 'rejected' }))).rejects.toThrow('patient_share_required');
    await expect(svc.decide({ id: 'lab' }, 'b1', both({ decision: 'approved', patient_share: 61 }, { decision: 'rejected' }))).rejects.toThrow('patient_share_above_price');
  });

  it('all approved: shares are final, the home fee stays cash unless approved', async () => {
    const a = make();
    const r = await a.svc.decide({ id: 'lab' }, 'b1', both({ decision: 'approved', patient_share: 10 }, { decision: 'approved', patient_share: 14 }));
    expect(r).toEqual({ status: 'approved', patient_share_total: 54 });
    expect(a.inserted[0].items.map((i: any) => i.insurer_share)).toEqual([50, 76]);
    expect(a.labs.applyOrderingDecision).toHaveBeenCalledWith('b1', 'approved', 54);
    const b = make();
    expect((await b.svc.decide({ id: 'lab' }, 'b1', { ...both({ decision: 'approved', patient_share: 10 }, { decision: 'approved', patient_share: 14 }), home_fee_approved: true })).patient_share_total).toBe(24);
  });

  it('a rejected item is paid in full by the patient; some rejected is partial, all rejected is rejected', async () => {
    const p = make();
    expect(await p.svc.decide({ id: 'lab' }, 'b1', both({ decision: 'approved', patient_share: 10 }, { decision: 'rejected' }))).toEqual({ status: 'partial', patient_share_total: 10 + 90 + 30 });
    const r = make();
    expect(await r.svc.decide({ id: 'lab' }, 'b1', both({ decision: 'rejected' }, { decision: 'rejected' }))).toEqual({ status: 'rejected', patient_share_total: 60 + 90 + 30 });
    // home fee is never covered when nothing was approved, even if the provider ticked it
    const h = make();
    expect((await h.svc.decide({ id: 'lab' }, 'b1', { ...both({ decision: 'rejected' }, { decision: 'rejected' }), home_fee_approved: true })).patient_share_total).toBe(180);
  });

  it('a booking is decided once', async () => {
    await expect(make(BOOKING, { code: 11000 }).svc.decide({ id: 'lab' }, 'b1', both({ decision: 'rejected' }, { decision: 'rejected' }))).rejects.toBeInstanceOf(ConflictException);
  });
});
