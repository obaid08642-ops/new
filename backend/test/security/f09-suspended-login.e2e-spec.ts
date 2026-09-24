/** F09: suspended provider accounts cannot log in (403 account_suspended). */
import { ProviderAuthService } from '../../src/modules/provider/services/provider-auth.service';
import { ProviderAccountStatus } from '../../src/modules/provider/provider.enums';
import { JwtService } from '@nestjs/jwt';
import { TEST_JWT_SECRET } from './harness';

describe('F09 suspended provider login rejected', () => {
  const svc = new ProviderAuthService(
    { findOne: async ({ email }: any) => email === 'stop@example.com'
      ? { id: 'prov-x', email, status: ProviderAccountStatus.SUSPENDED, password_hash: 'x', provider_type: 'doctor' }
      : null } as any,
    {} as any,
    { create: async () => ({}) } as any,
    {} as any,
    {} as any,
    new JwtService({ secret: TEST_JWT_SECRET }),
  );

  it('suspended account → 403 account_suspended (before password check)', async () => {
    await expect(svc.login({ email: 'stop@example.com', password: 'anything' }))
      .rejects.toMatchObject({ status: 403, message: 'account_suspended' });
  });

  it('unknown email → 401 invalid credentials', async () => {
    await expect(svc.login({ email: 'nobody@example.com', password: 'x' }))
      .rejects.toMatchObject({ status: 401 });
  });

  it('approved provider whose linked user is banned (users.active=false) → 403 on login', async () => {
    const usersCol = { findOne: async ({ id }: any) => (id === 'user-banned' ? { id, active: false } : null) };
    const banned = new ProviderAuthService(
      {
        findOne: async () => ({ id: 'user-banned', user_id: 'user-banned', email: 'b@example.com', status: ProviderAccountStatus.APPROVED, password_hash: 'x', provider_type: 'doctor' }),
        model: { db: { collection: () => usersCol } },
      } as any,
      {} as any,
      { create: async () => ({}) } as any,
      {} as any,
      {} as any,
      new JwtService({ secret: TEST_JWT_SECRET }),
    );
    await expect(banned.login({ email: 'b@example.com', password: 'anything' }))
      .rejects.toMatchObject({ status: 403, message: 'account_suspended' });
  });
});
