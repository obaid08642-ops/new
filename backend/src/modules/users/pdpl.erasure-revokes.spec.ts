import * as bcrypt from 'bcryptjs';
import { PdplService } from './pdpl.service';

// Needs-review issue 757: deleting the account must end the sessions on the server, not rely on the
// app's own logout call. Refresh is already refused for an inactive user; the access token is revoked
// by bumping token_version, which auth.guard compares on every request.
describe('PDPL erasure revokes the access tokens already issued', () => {
  it('increments users.token_version when the account is erased', async () => {
    const secret = `pw-${Math.random().toString(36).slice(2)}`;
    const hash = await bcrypt.hash(secret, 4);
    const user = { id: 'u-erase-1', password_hash: hash, active: true };
    const findOneAndUpdate = jest.fn().mockResolvedValue({ ...user, active: false });
    const userModel: any = {
      findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(user) }),
      findOneAndUpdate,
    };
    const conn: any = {
      db: { listCollections: () => ({ toArray: () => Promise.resolve([]) }) },
      collection: jest.fn(),
    };
    const svc = new PdplService(conn, userModel);
    await svc.erasePatientData('u-erase-1', { password: secret, reason: 'test' });
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const update = findOneAndUpdate.mock.calls[0][1];
    expect(update.$set.active).toBe(false);
    expect(update.$inc).toEqual({ token_version: 1 });
  });
});
