import { UsersService } from './users.service';

// issue 1585: GET /users/me/storage sends stable item keys, never a server-written (Arabic) label.
const ARABIC = /[؀-ۿ]/;

function serviceFor() {
  const service: any = Object.create(UsersService.prototype);
  service.conn = { db: { collection: jest.fn(() => ({ aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([{ total: 4 }]) })) })) } };
  return service as UsersService;
}

describe('issue 1585 storage item keys', () => {
  it('returns the two storage items by stable key without any Arabic text', async () => {
    const out: any = await serviceFor().getStorageDetails('pat-1');
    expect(out.items.map((i: { key: string }) => i.key)).toEqual(['uploaded_prescriptions', 'medical_reports']);
    for (const item of out.items) {
      expect(item.label).toBeUndefined();
      expect(typeof item.val).toBe('string');
      expect(typeof item.pct).toBe('number');
    }
    expect(ARABIC.test(JSON.stringify(out))).toBe(false);
  });
});
