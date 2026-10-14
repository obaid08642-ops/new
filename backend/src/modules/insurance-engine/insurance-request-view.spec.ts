import { InsuranceFlowService } from './insurance-engine.module';

/** #830/#846 one approval number; #825 the insurer's share is the server's figure. */
describe('the insurance request view', () => {
  const svc: any = Object.create(InsuranceFlowService.prototype);

  it('reads an old provider-path row (approval_code) as the one approval number, and never returns approval_code', () => {
    const out = svc.presentRequest({ id: 'r1', state: 'APPROVED_PARTIAL', price: 300, copay_amount: 60, approval_code: 'AP-77' });
    expect(out).toMatchObject({ approval_ref: 'AP-77', insurer_approval_code: 'AP-77', insurer_share: 240 });
    expect(out).not.toHaveProperty('approval_code');
  });

  it('a full approval covers the whole price; an undecided or rejected request has no insurer share', () => {
    expect(svc.presentRequest({ state: 'APPROVED_FULL', price: 150, copay_amount: 10 }).insurer_share).toBe(150);
    expect(svc.presentRequest({ state: 'PENDING_PROVIDER_REVIEW', price: 150 })).not.toHaveProperty('insurer_share');
    expect(svc.presentRequest({ state: 'REJECTED', price: 150 })).not.toHaveProperty('insurer_share');
  });
});
