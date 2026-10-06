import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WishlistShareService } from './wishlist-share.service';

function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$in' in c) return (c['$in'] as unknown[]).includes(v);
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    find: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => ({
      toArray: jest.fn().mockResolvedValue(docs.filter((d) => match(d, filter))),
    })),
    findOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const hit = docs.find((d) => match(d, filter));
      return hit ? { ...hit } : null;
    }),
    insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
      docs.push({ ...doc });
      return { acknowledged: true };
    }),
    deleteOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const idx = docs.findIndex((d) => match(d, filter));
      if (idx < 0) return { deletedCount: 0 };
      docs.splice(idx, 1);
      return { deletedCount: 1 };
    }),
  };
}

describe('WishlistShareService (P22.2 shareable wishlists)', () => {
  const meds = [
    { id: 'med-a', name_ar: 'دواء أ', name_en: 'Med A', price: 25, image: 'img-a' },
    { id: 'med-b', name_ar: 'دواء ب', price: 40 },
  ];

  function setup() {
    const collections: Record<string, ReturnType<typeof memCollection>> = {
      medicines: memCollection(meds),
      wishlist_shares: memCollection([]),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    return { service: new WishlistShareService(conn as never), collections };
  }

  it('shares and resolves a snapshot with public fields only (no data leak)', async () => {
    const { service } = setup();
    const created = await service.createShare('owner-1', ['med-a', 'med-b']);
    expect(created.token).toHaveLength(48);

    const resolved = await service.resolve(created.token);
    expect(resolved.items).toHaveLength(2);
    expect(resolved.items[0]).toEqual({
      id: 'med-a',
      name_ar: 'دواء أ',
      name_en: 'Med A',
      price: 25,
      image: 'img-a',
    });
    // The resolve payload carries no owner identity or internals.
    const leaked = JSON.stringify(resolved);
    expect(leaked).not.toMatch('owner-1');
    expect(Object.keys(resolved).sort()).toEqual(['created_at', 'items', 'token']);
  });

  it('refuses unknown items instead of faking success', async () => {
    const { service, collections } = setup();
    await expect(service.createShare('owner-1', ['delisted-1'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(collections.wishlist_shares.docs).toHaveLength(0);
  });

  it('404s on an unknown token', async () => {
    const { service } = setup();
    await expect(service.resolve('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revoke is owner-scoped; revoked links stop resolving', async () => {
    const { service } = setup();
    const created = await service.createShare('owner-1', ['med-a']);
    await expect(service.revoke('owner-2', created.token)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Still resolvable after the failed foreign revoke.
    await expect(service.resolve(created.token)).resolves.toBeTruthy();
    await expect(service.revoke('owner-1', created.token)).resolves.toEqual({
      ok: true,
    });
    await expect(service.resolve(created.token)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listMine only returns the caller shares', async () => {
    const { service } = setup();
    await service.createShare('owner-1', ['med-a']);
    await service.createShare('owner-2', ['med-b']);
    const mine = await service.listMine('owner-1');
    expect(mine).toHaveLength(1);
    expect(mine[0].items_count).toBe(1);
  });
});
