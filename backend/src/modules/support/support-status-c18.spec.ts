import { SupportService } from './support.service';

// OC-C C-18 (759/774/775): ticket lists carry stable status codes for client chips.
function serviceFor() {
  const service: any = Object.create(SupportService.prototype);
  service.req = {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([{ id: 'sup-1', status: 'IN_PROGRESS' }]) }) }),
  };
  return service as SupportService;
}

describe('OC C-18 support status codes', () => {
  it('mine() returns the raw status code', async () => {
    const rows: any[] = await serviceFor().mine({ id: 'pat-1' });
    expect(rows[0]?.status).toBe('IN_PROGRESS');
  });
});
