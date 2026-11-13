import 'reflect-metadata';
import { ROLES_KEY } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { HospitalEnterpriseController } from './hospital-enterprise.controller';

// `providers/enterprise/*` takes the hospital, branch and requester ids from the request and never compares them with the caller's own
// facility, so it must not be reachable by a facility account: only an admin may call it (nothing in the apps calls it).
describe('HospitalEnterpriseController access', () => {
  it('is ADMIN only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, HospitalEnterpriseController)).toEqual([UserRole.ADMIN]);
  });

  it('no handler widens the roles again', () => {
    const proto = HospitalEnterpriseController.prototype as any;
    for (const name of Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && typeof proto[n] === 'function')) {
      const own = Reflect.getMetadata(ROLES_KEY, proto[name]);
      expect([name, own === undefined || (Array.isArray(own) && own.length === 1 && own[0] === UserRole.ADMIN)]).toEqual([name, true]);
    }
  });
});
