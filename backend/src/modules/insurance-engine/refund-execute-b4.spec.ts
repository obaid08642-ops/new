import { BadRequestException } from '@nestjs/common';
import { RefundService } from './insurance-engine.module';

// B-4: approving a refund moves the money; the state says what really happened.
function make(state: string, exec: jest.Mock) {
  const doc: any = { id: 'rf-1', state, history: [], booking_kind: 'appointment', booking_id: 'b1', patient_id: 'p1', refund_amount: 50, save: jest.fn(async () => doc), toObject: () => ({ ...doc }) };
  const refunds: any = { findOne: jest.fn(async () => doc) };
  const svc = new RefundService(refunds, { emit: jest.fn() } as any, {} as any, undefined, { execute: exec } as any);
  return { svc, doc };
}
const admin = { id: 'adm-1' };

describe('refund approval executes the refund (B-4)', () => {
  it('success ends EXECUTED with the time', async () => {
    const exec = jest.fn().mockResolvedValue({ ok: true, method: 'gateway', gateway_refund_id: 'g-1' });
    const { svc, doc } = make('REQUESTED', exec);
    const out: any = await svc.decide(admin, 'rf-1', true, 'ok');
    expect(exec).toHaveBeenCalledWith(expect.objectContaining({ refund_id: 'rf-1', amount: 50, patient_id: 'p1' }));
    expect(out.state).toBe('EXECUTED');
    expect(doc.executed_at).toBeInstanceOf(Date);
  });

  it('a failed execution is FAILED (not a silent approval) and can be approved again', async () => {
    const exec = jest.fn().mockRejectedValueOnce(new Error('gateway down')).mockResolvedValueOnce({ ok: true, method: 'wallet' });
    const { svc } = make('REQUESTED', exec);
    expect(((await svc.decide(admin, 'rf-1', true)) as any).state).toBe('FAILED');
    expect(((await svc.decide(admin, 'rf-1', true, 'again')) as any).state).toBe('EXECUTED');
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('rejection moves no money; a decided refund cannot be decided again', async () => {
    const exec = jest.fn();
    const { svc } = make('REQUESTED', exec);
    expect(((await svc.decide(admin, 'rf-1', false, 'no')) as any).state).toBe('REJECTED');
    expect(exec).not.toHaveBeenCalled();
    await expect(make('EXECUTED', exec).svc.decide(admin, 'rf-1', true)).rejects.toBeInstanceOf(BadRequestException);
  });
});
