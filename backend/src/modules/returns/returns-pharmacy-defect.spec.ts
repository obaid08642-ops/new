import { BadRequestException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

// Owner decision 2026-11-10: a pharmacy order is refunded after preparation only for a wrong, damaged or expired item, with a photo and an admin review.
describe('a pharmacy return request', () => {
  const svc: any = Object.create(ReturnsService.prototype);
  svc.eligibility = jest.fn(async () => { throw new Error('reached eligibility'); });
  const ask = (data: any) => svc.createRequest('p1', { serviceType: 'pharmacy', orderId: 'o1', ...data }).then(() => null, (e: any) => e);

  it('needs a defect reason: wrong item, damaged, expired or not as described; "changed my mind" is not refunded', async () => {
    for (const reason of ['changed_mind', 'late_delivery', 'duplicate_order', 'other', 'سبب آخر']) {
      const e = await ask({ reason, attachedDocs: ['media:abc'] });
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.message).toBe('pharmacy_return_needs_a_defect_reason');
    }
  });
  it('needs at least one photo', async () => {
    for (const attachedDocs of [undefined, [], null]) {
      const e = await ask({ reason: 'damaged', attachedDocs });
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.message).toBe('photo_evidence_required');
    }
  });
  it('a defect reason with a photo goes on to the normal checks (eligibility, owned media, admin review)', async () => {
    for (const reason of ['wrong_item', 'damaged', 'expired', 'not_as_described']) {
      const e = await ask({ reason, attachedDocs: ['media:abc'] });
      expect(e.message).toBe('reached eligibility');
    }
  });
  it('other services (a consultation) are not subject to the pharmacy rule', async () => {
    const other: any = Object.create(ReturnsService.prototype);
    other.conn = { collection: () => ({ findOne: async () => null, find: () => ({ toArray: async () => [] }) }) };
    const e = await other.createRequest('p1', { serviceType: 'consultation', orderId: 'a1', reason: 'changed_mind' }).then(() => null, (x: any) => x);
    expect(e?.message).not.toBe('pharmacy_return_needs_a_defect_reason');
    expect(e?.message).not.toBe('photo_evidence_required');
  });
});
