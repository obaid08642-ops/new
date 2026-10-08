import {
  buildShareIds,
  createWishlistShare,
  listWishlistShares,
  resolveWishlistShare,
  revokeWishlistShare,
  sanitizeSharedItems,
} from './wishlist-share';

describe('P22.2 wishlist share (no-leak)', () => {
  it('sanitizes resolved items down to the public field set', () => {
    expect(
      sanitizeSharedItems([
        {
          id: 'm1',
          name_ar: 'دواء',
          name_en: 'Med',
          price: 12.5,
          image: 'img',
          owner_id: 'victim-1',
          owner_phone: '+9665',
          cost_price: 1,
          margin: 0.9,
        },
      ]),
    ).toEqual([{ id: 'm1', name_ar: 'دواء', name_en: 'Med', price: 12.5, image: 'img' }]);
  });

  it('drops rows without an id and non-arrays', () => {
    expect(sanitizeSharedItems([{ name_ar: 'x' }])).toEqual([]);
    expect(sanitizeSharedItems(null)).toEqual([]);
  });

  it('guards share input: non-empty, de-duplicated, max 50', () => {
    expect(buildShareIds(['a', 'a', 'b'])).toEqual(['a', 'b']);
    expect(() => buildShareIds([])).toThrow('share_items_required');
    expect(() => buildShareIds(Array.from({ length: 51 }, (_, i) => `m${i}`))).toThrow('share_too_many_items');
  });

  it('creates shares via POST wishlist/share', async () => {
    const fetch = jest.fn().mockResolvedValue({ token: 'tok', items: [], created_at: '2026-10-06' });
    await createWishlistShare(fetch, ['m1']);
    const [path, init] = fetch.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe('/wishlist/share');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ item_ids: ['m1'] });
  });

  it('resolves the public link and sanitizes on the way in', async () => {
    const fetch = jest.fn().mockResolvedValue({
      token: 'tok',
      items: [{ id: 'm1', name_ar: 'د', price: 5, owner_id: 'leak?' }],
      created_at: '2026-10-06',
    });
    const share = await resolveWishlistShare(fetch, 'tok');
    expect(fetch).toHaveBeenCalledWith('/wishlist/shared/tok');
    expect(share.items).toEqual([{ id: 'm1', name_ar: 'د', name_en: null, price: 5, image: null }]);
  });

  it('lists and revokes owner shares through the contract paths', async () => {
    const fetch = jest.fn().mockResolvedValue([{ token: 't', items_count: 2 }]);
    await expect(listWishlistShares(fetch)).resolves.toEqual([{ token: 't', items_count: 2 }]);
    expect(fetch).toHaveBeenCalledWith('/wishlist/shares');
    await revokeWishlistShare(fetch, 't');
    expect(fetch.mock.calls[1][0]).toBe('/wishlist/shares/t');
  });
});
