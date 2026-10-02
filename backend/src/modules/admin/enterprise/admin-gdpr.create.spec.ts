import { NotFoundException } from '@nestjs/common';
import { AdminGdprController } from './admin-crm.controller';

// Q13: a GDPR/PDPL request for an id that is not a user was accepted and stayed open forever.
describe('AdminGdprController.createRequest', () => {
  const make = (userExists: boolean) => {
    const inserted: any[] = [];
    const conn: any = {
      collection: (name: string) => ({
        findOne: jest.fn().mockResolvedValue(name === 'users' ? (userExists ? { _id: 'u' } : null) : null),
        insertOne: jest.fn(async (d: any) => { inserted.push(d); }),
      }),
    };
    const audit: any = { write: jest.fn() };
    return { ctl: new AdminGdprController(conn, audit), inserted, audit };
  };

  it('refuses a user id that does not exist (404 user_not_found) and writes nothing', async () => {
    const { ctl, inserted, audit } = make(false);
    await expect(ctl.createRequest({ user_id: 'W3C31601', type: 'delete' } as any, { id: 'admin-1' })).rejects.toBeInstanceOf(NotFoundException);
    expect(inserted).toHaveLength(0);
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('creates the request for a real user', async () => {
    const { ctl, inserted } = make(true);
    const r: any = await ctl.createRequest({ user_id: 'e3909770-85e0-475d-a857-42285a984a16', type: 'export' } as any, { id: 'admin-1' });
    expect(r.status).toBe('requested');
    expect(inserted).toHaveLength(1);
  });
});
