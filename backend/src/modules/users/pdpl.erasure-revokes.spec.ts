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

  // `DELETE /users/me` is reachable by every signed-in role; only patients (and guests) can erase themselves here.
  it.each(['doctor', 'pharmacy', 'lab', 'admin', 'super_admin', 'hospital_admin'])('refuses %s before any password check and changes nothing', async (role) => {
    const user = { id: 'u-staff-1', role, password_hash: await bcrypt.hash('pw', 4), active: true };
    const findOneAndUpdate = jest.fn();
    const userModel: any = { findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(user) }), findOneAndUpdate };
    const conn: any = { db: { listCollections: () => ({ toArray: () => Promise.resolve([]) }) }, collection: jest.fn() };
    const svc = new PdplService(conn, userModel);

    await expect(svc.erasePatientData('u-staff-1', { password: 'pw', reason: 'test' })).rejects.toMatchObject({ response: { code: 'erasure_not_available_for_role' } });

    expect(findOneAndUpdate).not.toHaveBeenCalled();
    expect(conn.collection).not.toHaveBeenCalled();
  });

  it('a patient and a guest (and an account with no role field, which defaults to patient) can still erase', async () => {
    for (const role of ['patient', 'guest', undefined]) {
      const user: any = { id: 'u-ok', password_hash: await bcrypt.hash('pw', 4), active: true, ...(role ? { role } : {}) };
      const findOneAndUpdate = jest.fn().mockResolvedValue({ ...user, active: false });
      const userModel: any = { findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(user) }), findOneAndUpdate };
      const conn: any = { db: { listCollections: () => ({ toArray: () => Promise.resolve([]) }) }, collection: jest.fn() };
      await new PdplService(conn, userModel).erasePatientData('u-ok', { password: 'pw', reason: 'test' });
      expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    }
  });
});
