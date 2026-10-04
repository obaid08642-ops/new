// R2 review (2676aed): adding a non-existent product to the wishlist answered
// 201 { ok:true, in_wishlist:true } (a fake success; reproduced live). R2 named
// it as a fake success to fix, and the gate allow-list hid it instead.
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function service(wishlist: Array<{ id: string }>) {
  const profile = { user_id: 'p1', wishlist: [...wishlist] };
  const patients = { findOne: jest.fn(async () => profile), updateOne: jest.fn(async () => ({})) };
  const idOf = (f: { id: string | { $eq: string } }) => (typeof f.id === 'object' ? f.id.$eq : f.id);
  const medicines = { findOne: jest.fn(async (f: { id: string | { $eq: string } }) => (idOf(f) === 'med-real' ? { id: 'med-real', name_ar: 'دواء', price: 12 } : null)) };
  const conn = { collection: () => medicines };
  const svc = new UsersService({} as never, patients as never, {} as never, conn as never, {} as never);
  return { svc, patients, profile };
}

describe('wishlist toggle (R2)', () => {
  it('refuses an item that does not exist (404), and stores nothing', async () => {
    const { svc, patients } = service([]);
    await expect(svc.toggleWishlist('p1', 'does-not-exist')).rejects.toThrow(NotFoundException);
    expect(patients.updateOne).not.toHaveBeenCalled();
  });
  it('adds a real medicine', async () => {
    const { svc, profile } = service([]);
    await expect(svc.toggleWishlist('p1', 'med-real')).resolves.toMatchObject({ ok: true, in_wishlist: true });
    expect(profile.wishlist.map((w) => w.id)).toEqual(['med-real']);
  });
  it('still removes an item already in the list, even if it was delisted', async () => {
    const { svc, profile } = service([{ id: 'delisted-1' }]);
    await expect(svc.toggleWishlist('p1', 'delisted-1')).resolves.toMatchObject({ in_wishlist: false });
    expect(profile.wishlist).toEqual([]);
  });
});
