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
      [{ id: 'med-1', name_ar: 'بنادول', name_en: 'Panadol', price: 12.5, requires_prescription: false, public_eligibility: true, medical_review_status: 'approved' }],
    );
    const out = await service.getWishlist('u-1');
    expect(out).toEqual([expect.objectContaining({ id: 'med-1', name_ar: 'بنادول', price: 12.5, available: true })]);
  });

  it('#464: an item no longer in the public catalogue is not available', async () => {
    const approved = { public_eligibility: true, medical_review_status: 'approved' };
    const rows = [
      { id: 'pending', name_ar: 'أ', public_eligibility: false, medical_review_status: 'pending' },
      { id: 'deleted', name_ar: 'ب', ...approved, is_deleted: true },
      { id: 'discontinued', name_ar: 'ج', ...approved, availability_status: 'discontinued' },
      { id: 'ok', name_ar: 'د', ...approved },
    ];
    const service = serviceFor({ user_id: 'u-1', wishlist: [...rows.map((r) => ({ id: r.id })), { id: 'gone' }] }, rows);
    const out = await service.getWishlist('u-1');
    expect(out.map((r: any) => [r.id, r.available])).toEqual([['pending', false], ['deleted', false], ['discontinued', false], ['ok', true], ['gone', false]]);
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
