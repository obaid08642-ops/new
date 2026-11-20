import { ProviderAccountStatus as S, PROVIDER_STATUS_TRANSITIONS as T } from './provider.enums';

describe('B2: the restricted account state (lapsed licence)', () => {
  it('an approved account can be restricted, and a restricted one can be approved again (renewed licence) or suspended by an admin', () => {
    expect(T[S.APPROVED]).toContain(S.RESTRICTED);
    expect(T[S.RESTRICTED]).toEqual(expect.arrayContaining([S.APPROVED, S.SUSPENDED]));
  });
  it('a restricted account cannot jump to a review or rejected state, and nothing but approved reaches restricted', () => {
    expect(T[S.RESTRICTED]).not.toContain(S.REJECTED);
    for (const from of Object.keys(T) as S[]) if (from !== S.APPROVED) expect(T[from]).not.toContain(S.RESTRICTED);
  });
});
