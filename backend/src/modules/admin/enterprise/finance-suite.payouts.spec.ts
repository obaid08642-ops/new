/** The one payout state machine: approve (two-step from the threshold) -> execute -> PAID; reject releases the balance. */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FinanceSuiteService } from './finance-suite.service';

const REASON = 'checked against the bank record';
const admin = (id: string) => ({ id, full_name: id });

const build = (w: any, opts: { reservation?: any; threshold?: number } = {}) => {
  const docs: Record<string, any> = { [w.id]: { ...w } };
  const ledger: any[] = opts.reservation === null ? [] : [{ id: `le_${w.id}`, type: 'payout', state: 'locked', ref_type: 'withdrawal_reservation', ref_id: w.id, provider_account_id: w.provider_id, amount: w.amount, ...(opts.reservation || {}) }];
  const match = (d: any, q: any) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$in' in v) ? v.$in.includes(d[k]) : d[k] === v);
  const withdrawals = {
    findOne: async (q: any) => Object.values(docs).find((d) => match(d, q)) ?? null,
    updateOne: async (q: any, u: any) => { const d = Object.values(docs).find((x) => match(x, q)); if (!d) return { modifiedCount: 0 }; Object.assign(d, u.$set); return { modifiedCount: 1 }; },
  };
  const conn: any = {
    collection: (name: string) => name === 'providerwithdrawals' ? withdrawals
      : name === 'platformledgerentries' ? {
        findOne: async (q: any) => ledger.find((e) => match(e, q)) ?? null,
        updateOne: async (q: any, u: any) => { const e = ledger.find((x) => match(x, q)); if (e) Object.assign(e, u.$set); return { modifiedCount: e ? 1 : 0 }; },
      }
      : name === 'finance_config' ? { findOne: async () => (opts.threshold ? { large_payout_sar: opts.threshold } : null) }
      : {},
  };
  const audit = { write: jest.fn(async () => undefined) };
  const svc: any = new (FinanceSuiteService as any)(conn, audit);
  return { svc, docs, ledger, audit };
};
const open = (over: any = {}) => ({ id: 'wd_1', provider_id: 'prov-1', amount: 500, state: 'PENDING_ADMIN_APPROVAL', ...over });

describe('payout state machine', () => {
  it('approve -> execute reaches PAID and clears the locked balance', async () => {
    const { svc, docs, ledger } = build(open());
    expect((await svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).state).toBe('APPROVED_FOR_PAYOUT');
    expect((await svc.executePayout('wd_1', admin('a1'), REASON)).state).toBe('PAID');
    expect(docs.wd_1).toMatchObject({ state: 'PAID', paid_by: 'a1' });
    expect(ledger[0].state).toBe('cleared');
  });

  it('cannot be paid before it is approved, nor paid twice', async () => {
    const { svc } = build(open());
    await expect(svc.executePayout('wd_1', admin('a1'), REASON)).rejects.toThrow('not_executable_in_state_PENDING_ADMIN_APPROVAL');
    await svc.approvePayout('wd_1', admin('a1'), REASON, 'approve');
    await svc.executePayout('wd_1', admin('a1'), REASON);
    await expect(svc.executePayout('wd_1', admin('a2'), REASON)).rejects.toThrow(BadRequestException);
  });

  it('a large amount needs a second, distinct admin before it can be paid', async () => {
    const { svc, docs } = build(open({ amount: 12000 }));
    expect((await svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).state).toBe('AWAITING_SECOND_APPROVAL');
    await expect(svc.executePayout('wd_1', admin('a1'), REASON)).rejects.toThrow('not_executable_in_state_AWAITING_SECOND_APPROVAL');
    await expect(svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).rejects.toThrow(ForbiddenException);
    expect((await svc.approvePayout('wd_1', admin('a2'), REASON, 'approve')).state).toBe('APPROVED_FOR_PAYOUT');
    expect((await svc.executePayout('wd_1', admin('a3'), REASON)).state).toBe('PAID');
    expect(docs.wd_1.approved_stage_one_by).toBe('a1');
  });

  it('one threshold: the finance approval config decides what is large', async () => {
    const { svc } = build(open({ amount: 800 }), { threshold: 500 });
    expect((await svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).state).toBe('AWAITING_SECOND_APPROVAL');
  });

  it('reject, from any open state, releases the locked balance; a rejected or paid payout is final', async () => {
    for (const state of ['PENDING_ADMIN_APPROVAL', 'AWAITING_SECOND_APPROVAL', 'APPROVED_FOR_PAYOUT']) {
      const { svc, docs, ledger } = build(open({ state }));
      expect((await svc.approvePayout('wd_1', admin('a1'), REASON, 'reject')).state).toBe('REJECTED');
      expect(docs.wd_1.state).toBe('REJECTED');
      expect(ledger[0].state).toBe('released');
      await expect(svc.approvePayout('wd_1', admin('a2'), REASON, 'approve')).rejects.toThrow('already_rejected');
    }
    const paid = build(open({ state: 'PAID' }));
    await expect(paid.svc.approvePayout('wd_1', admin('a1'), REASON, 'reject')).rejects.toThrow('already_paid');
  });

  it('an approved payout cannot be approved again, and a missing reservation blocks the payment', async () => {
    const a = build(open({ state: 'APPROVED_FOR_PAYOUT' }));
    await expect(a.svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).rejects.toThrow('not_approvable_in_state_APPROVED_FOR_PAYOUT');
    const b = build(open({ state: 'APPROVED_FOR_PAYOUT' }), { reservation: null });
    await expect(b.svc.executePayout('wd_1', admin('a1'), REASON)).rejects.toThrow('withdrawal_reservation_missing_or_mismatched');
    expect(b.docs.wd_1.state).toBe('APPROVED_FOR_PAYOUT');
  });

  it('the provider can never approve or pay their own payout, and a reason is required', async () => {
    const { svc } = build(open({ state: 'APPROVED_FOR_PAYOUT' }));
    await expect(svc.executePayout('wd_1', admin('prov-1'), REASON)).rejects.toThrow('cannot_approve_own_payout');
    await expect(svc.executePayout('wd_1', admin('a1'), 'short')).rejects.toThrow();
  });
});

describe('an approval races a reject (the state is the claim)', () => {
  // the payout is read as open, then another admin rejects it before the approval writes: the approval must not bring a rejected payout back
  const racing = (w: any) => {
    const t = build(w);
    const real = (t.svc as any).withdrawals.findOne.bind((t.svc as any).withdrawals);
    let first = true;
    (t.svc as any).conn.collection = ((orig: any) => (name: string) => {
      const c = orig(name);
      if (name !== 'providerwithdrawals') return c;
      return { ...c, findOne: async (q: any) => { const row = await c.findOne(q); if (first && row) { first = false; const snap = { ...row }; t.docs.wd_1.state = 'REJECTED'; t.ledger[0].state = 'released'; return snap; } return row; }, updateOne: c.updateOne };
    })((t.svc as any).conn.collection);
    void real;
    return t;
  };
  it('a single approval that lost to a reject changes nothing: still REJECTED, balance still released', async () => {
    const { svc, docs, ledger } = racing(open());
    await expect(svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).rejects.toThrow('payout_state_changed');
    expect(docs.wd_1.state).toBe('REJECTED');
    expect(ledger[0].state).toBe('released');
    expect(docs.wd_1.approved_by).toBeUndefined();
  });
  it('a stage-one approval that lost to a reject does not bring it back to AWAITING_SECOND_APPROVAL', async () => {
    const { svc, docs } = racing(open({ amount: 12000 }));
    await expect(svc.approvePayout('wd_1', admin('a1'), REASON, 'approve')).rejects.toThrow('payout_state_changed');
    expect(docs.wd_1.state).toBe('REJECTED');
    expect(docs.wd_1.approved_stage_one_by).toBeUndefined();
  });
  it('a final approval that lost to a reject does not bring it back to APPROVED_FOR_PAYOUT', async () => {
    const { svc, docs } = racing(open({ amount: 12000, state: 'AWAITING_SECOND_APPROVAL', approved_stage_one_by: 'a1' }));
    await expect(svc.approvePayout('wd_1', admin('a2'), REASON, 'approve')).rejects.toThrow('payout_state_changed');
    expect(docs.wd_1.state).toBe('REJECTED');
    expect(docs.wd_1.approved_by).toBeUndefined();
  });
  it('two admins finishing the second approval at once: one wins, the other gets a refusal and cannot overwrite the first', async () => {
    const { svc, docs } = build(open({ amount: 12000, state: 'AWAITING_SECOND_APPROVAL', approved_stage_one_by: 'a1' }));
    const results = await Promise.allSettled([svc.approvePayout('wd_1', admin('a2'), REASON, 'approve'), svc.approvePayout('wd_1', admin('a3'), REASON, 'approve')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(docs.wd_1.state).toBe('APPROVED_FOR_PAYOUT');
    expect(['a2', 'a3']).toContain(docs.wd_1.approved_by);
  });
});

