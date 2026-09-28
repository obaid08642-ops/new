import { UsersService } from './users.service';

function serviceFor(profile: any, medicines: any[]) {
  const service: any = Object.create(UsersService.prototype);
  service.patientRepository = {
    findOne: jest.fn().mockResolvedValue(profile),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  service.conn = {
    collection: jest.fn().mockReturnValue({
      find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(medicines) }),
      findOne: jest.fn().mockResolvedValue(medicines[0] || null),
    }),
  };
  service.rankingEvents = undefined;
  return service;
}

describe('UsersService wishlist (LJ-08)', () => {
  it('enriches stored rows with the live medicine name and price', async () => {
    const service = serviceFor(
      { user_id: 'u-1', wishlist: [{ id: 'med-1', name_ar: 'قديم', price: 1 }] },
      [{ id: 'med-1', name_ar: 'بنادول', name_en: 'Panadol', price: 12.5, requires_prescription: false }],
    );
    const out = await service.getWishlist('u-1');
    expect(out).toEqual([expect.objectContaining({ id: 'med-1', name_ar: 'بنادول', price: 12.5, available: true })]);
  });

  it('snapshots the medicine when adding, and toggles off on a second call', async () => {
    const service = serviceFor({ user_id: 'u-1', wishlist: [] }, [{ id: 'med-1', name_ar: 'بنادول', price: 12.5 }]);
    const add = await service.toggleWishlist('u-1', 'med-1');
    expect(add.in_wishlist).toBe(true);
    expect(service.patientRepository.updateOne).toHaveBeenCalledWith({ user_id: 'u-1' }, { $set: { wishlist: [expect.objectContaining({ id: 'med-1', name_ar: 'بنادول', price: 12.5 })] } });

    const withItem = serviceFor({ user_id: 'u-1', wishlist: [{ id: 'med-1' }] }, []);
    await withItem.toggleWishlist('u-1', 'med-1');
    expect(withItem.patientRepository.updateOne).toHaveBeenCalledWith({ user_id: 'u-1' }, { $set: { wishlist: [] } });
  });
});
