import { HttpException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

function svc(pending: number) {
  const inserted: unknown[] = [];
  const s: any = Object.create(MedicinesService.prototype);
  s.notifyAdmin = async () => undefined; s.audit = () => undefined;
  s.getById = async () => ({ id: 'm1', name_ar: 'x', description_ar: 'old' });
  Object.defineProperty(s, 'changeRequests', { value: { countDocuments: async () => pending, findOne: async () => null, insertOne: async (d: unknown) => { inserted.push(d); } } });
  return { s: s as MedicinesService, inserted };
}

describe('anonymous suggest-change cap', () => {
  it('a guest under the cap can leave a suggestion', async () => {
    const { s, inserted } = svc(MedicinesService.GUEST_PENDING_PER_ITEM - 1);
    await s.suggestChange('m1', { id: 'guest', role: 'guest' }, { type: 'other', note: 'n' });
    expect(inserted).toHaveLength(1);
  });
  it('at the cap a guest gets 429 and nothing is written', async () => {
    const { s, inserted } = svc(MedicinesService.GUEST_PENDING_PER_ITEM);
    const err = await s.suggestChange('m1', { id: 'guest', role: 'guest' }, { type: 'other', note: 'n' }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(inserted).toHaveLength(0);
  });
  it('a signed-in account is not counted against the guest cap', async () => {
    const { s, inserted } = svc(99);
    await s.suggestChange('m1', { id: 'u1', role: 'patient' }, { type: 'other', note: 'n' });
    expect(inserted).toHaveLength(1);
  });
});
