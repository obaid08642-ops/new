// R11 independent check: POST /admin/authority/users/:id/impersonate signed a
// full access token for any target user (another admin included) with the
// target's role and no scope, session, token_version or expiry of its own, so
// it passed every access-token check and could not be revoked. The admin
// console uses the governed support sessions (/admin/impersonation/*). The
// legacy route and its signer are removed.
import 'reflect-metadata';
import * as mod from './admin-authority.module';

describe('no ungoverned impersonation token (R11)', () => {
  it('no admin-authority route impersonates, and the service has no signer', () => {
    for (const C of Object.values(mod) as Function[]) {
      if (typeof C !== 'function' || !C.prototype) continue;
      for (const name of Object.getOwnPropertyNames(C.prototype)) {
        const h = Object.getOwnPropertyDescriptor(C.prototype, name)?.value;
        if (typeof h === 'function') expect(String(Reflect.getMetadata('path', h) ?? '')).not.toMatch(/impersonate/);
        expect(name).not.toBe('impersonateUser');
      }
    }
  });
});
