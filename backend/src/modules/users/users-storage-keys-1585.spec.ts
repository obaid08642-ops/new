import { UsersService } from './users.service';

// issue 1585: GET /users/me/storage sends stable item keys, that the clients translate (the legacy Arabic `label` is kept only for installed app builds).
const ARABIC = /[؀-ۿ]/;

function serviceFor() {
  const service: any = Object.create(UsersService.prototype);
  service.conn = { db: { collection: jest.fn(() => ({ aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([{ total: 4 }]) })) })) } };
  return service as UsersService;
}

describe('issue 1585 storage item keys', () => {
  it('returns the two storage items by stable key; Arabic only in the legacy label', async () => {
    const out: any = await serviceFor().getStorageDetails('pat-1');
    expect(out.items.map((i: { key: string }) => i.key)).toEqual(['uploaded_prescriptions', 'medical_reports']);
    for (const item of out.items) {
      expect(typeof item.val).toBe('string');
      expect(typeof item.pct).toBe('number');
    }
    // Only the legacy `label` (for installed app builds) may carry Arabic; every other field is language-free.
    expect(ARABIC.test(JSON.stringify(out.items.map(({ label: _legacy, ...rest }: { label?: string }) => rest)))).toBe(false);
  });
});
