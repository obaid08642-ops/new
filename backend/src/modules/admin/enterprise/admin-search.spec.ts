import { AdminSearchController } from './admin-search.controller';

/** P6.x-11: global search guardrails. */
describe('AdminSearchController', () => {
  const make = (found: any = []) => {
    const conn: any = { collection: jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(found) }) }) }) };
    return { ctrl: new AdminSearchController(conn), conn };
  };

  it('rejects short queries', async () => {
    const { ctrl } = make();
    await expect(ctrl.search({ q: 'x' })).rejects.toThrow();
  });

  it('fans out to all four groups with caps', async () => {
    const { ctrl, conn } = make([{ id: 'u1' }]);
    const out: any = await ctrl.search({ q: '+966500000001' });
    expect(conn.collection).toHaveBeenCalledWith('users');
    expect(conn.collection).toHaveBeenCalledWith('provider_profiles');
    expect(conn.collection).toHaveBeenCalledWith('orders');
    expect(conn.collection).toHaveBeenCalledWith('appointments');
    expect(out.q).toBe('+966500000001');
  });
});
